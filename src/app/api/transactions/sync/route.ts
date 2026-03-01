import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { getERC20Transactions } from '@/lib/providers/etherscan'
import { getTRC20Transactions } from '@/lib/providers/trongrid'

export const maxDuration = 60

export async function POST() {
    const { error } = await requireAdmin()
    if (error) return error

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
        async start(controller) {
                function send(event: string, data: any) {
                          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
                }

          try {
                    const wallets = await prisma.wallet.findMany()

                  if (wallets.length === 0) {
                              send('log', { message: 'No wallets found. Add wallets first.' })
                              send('done', { ok: true, synced: 0 })
                              controller.close()
                              return
                  }

                  send('log', { message: `Starting sync for ${wallets.length} wallet(s)...` })
                    send('progress', { current: 0, total: wallets.length })

                  let totalSynced = 0

                  for (let i = 0; i < wallets.length; i++) {
                              const wallet = wallets[i]
                              const label = wallet.label || wallet.address.slice(0, 10) + '...'
                              send('log', { message: `[${i + 1}/${wallets.length}] Syncing ${wallet.network} wallet: ${label}` })

                      try {
                                    if (wallet.network === 'ERC20') {
                                                    send('log', { message: `  Fetching ERC20 transactions from Etherscan...` })
                                                    const txs = await getERC20Transactions(wallet.address)
                                                    send('log', { message: `  Found ${txs.length} transactions` })

                                      let walletSynced = 0
                                                    for (const tx of txs) {
                                                                      const direction = tx.to.toLowerCase() === wallet.address.toLowerCase() ? 'IN' : 'OUT'
                                                                      await prisma.transaction.upsert({
                                                                                          where: {
                                                                                                                network_hash_wallet: {
                                                                                                                                        network: 'ERC20',
                                                                                                                                        hash: tx.hash,
                                                                                                                                        wallet: wallet.address,
                                                                                                                  },
                                                                                            },
                                                                                          update: {},
                                                                                          create: {
                                                                                                                network: 'ERC20',
                                                                                                                hash: tx.hash,
                                                                                                                wallet: wallet.address,
                                                                                                                token: tx.contractAddress || null,
                                                                                                                direction,
                                                                                                                amount: tx.value,
                                                                                                                timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
                                                                                                                blockNumber: parseInt(tx.blockNumber, 10),
                                                                                                                fee: tx.gasUsed && tx.gasPrice
                                                                                                                  ? String(BigInt(tx.gasUsed) * BigInt(tx.gasPrice))
                                                                                                                                        : null,
                                                                                                                status: tx.isError === '0' ? 'confirmed' : 'failed',
                                                                                            },
                                                                      })
                                                                      walletSynced++
                                                    }
                                                    totalSynced += walletSynced
                                                    send('log', { message: `  Saved ${walletSynced} transactions` })
                                    }

                                if (wallet.network === 'TRC20') {
                                                send('log', { message: `  Fetching TRC20 transactions from TronGrid...` })
                                                const txs = await getTRC20Transactions(wallet.address)
                                                send('log', { message: `  Found ${txs.length} transactions` })

                                      let walletSynced = 0
                                                for (const tx of txs) {
                                                                  const direction = tx.to.toLowerCase() === wallet.address.toLowerCase() ? 'IN' : 'OUT'
                                                                  await prisma.transaction.upsert({
                                                                                      where: {
                                                                                                            network_hash_wallet: {
                                                                                                                                    network: 'TRC20',
                                                                                                                                    hash: tx.transaction_id,
                                                                                                                                    wallet: wallet.address,
                                                                                                              },
                                                                                        },
                                                                                      update: {},
                                                                                      create: {
                                                                                                            network: 'TRC20',
                                                                                                            hash: tx.transaction_id,
                                                                                                            wallet: wallet.address,
                                                                                                            token: tx.token_info?.address || null,
                                                                                                            direction,
                                                                                                            amount: tx.value,
                                                                                                            timestamp: new Date(tx.block_timestamp),
                                                                                                            blockNumber: tx.block,
                                                                                                            fee: null,
                                                                                                            status: 'confirmed',
                                                                                        },
                                                                  })
                                                                  walletSynced++
                                                }
                                                totalSynced += walletSynced
                                                send('log', { message: `  Saved ${walletSynced} transactions` })
                                }
                      } catch (e: any) {
                                    send('log', { message: `  ERROR: ${e.message}` })
                      }

                      send('progress', { current: i + 1, total: wallets.length })
                  }

                  send('log', { message: `Sync complete. Total synced: ${totalSynced} transactions.` })
                    send('done', { ok: true, synced: totalSynced })
          } catch (e: any) {
                    send('log', { message: `FATAL ERROR: ${e.message}` })
                    send('done', { ok: false, error: e.message })
          }

          controller.close()
        },
  })

  return new Response(stream, {
        headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
        },
  })
}
