import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchERC20Transactions, mapEtherscanTx } from '@/lib/etherscan'

export const maxDuration = 60

export async function GET(req: NextRequest) {
    try {
          const wallets = await prisma.wallet.findMany()
          const results: { wallet: string; network: string; synced: number; errors: string[] }[] = []

                for (const wallet of wallets) {
                        const walletResult = { wallet: wallet.address, network: wallet.network, synced: 0, errors: [] as string[] }

            if (wallet.network === 'ERC20') {
                      try {
                                  const txs = await fetchERC20Transactions(wallet.address)
                                  let synced = 0
                                  for (const tx of txs) {
                                                const mapped = mapEtherscanTx(tx, wallet.address)
                                                try {
                                                                await prisma.transaction.upsert({
                                                                                  where: {
                                                                                                      network_hash_wallet: {
                                                                                                                            network: mapped.network,
                                                                                                                            hash: mapped.hash,
                                                                                                                            wallet: mapped.wallet,
                                                                                                        },
                                                                                  },
                                                                                  update: {},
                                                                                  create: mapped,
                                                                })
                                                                synced++
                                                } catch (e: any) {
                                                                walletResult.errors.push(`tx ${tx.hash}: ${e.message}`)
                                                }
                                  }
                                  walletResult.synced = synced
                      } catch (e: any) {
                                  walletResult.errors.push(`Etherscan: ${e.message}`)
                      }
            }

            if (wallet.network === 'TRC20') {
                      try {
                                  const res = await fetch(
                                                `https://api.trongrid.io/v1/accounts/${wallet.address}/transactions/trc20?limit=100&order_by=block_timestamp,desc`,
                                    { headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY || '' } }
                                              )
                                  const data = await res.json()
                                  let synced = 0
                                  if (data.data && Array.isArray(data.data)) {
                                                for (const tx of data.data) {
                                                                const direction = tx.to === wallet.address ? 'IN' : 'OUT'
                                                                try {
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
                                                                                                                            amount: tx.value || '0',
                                                                                                                            timestamp: new Date(tx.block_timestamp),
                                                                                                                            blockNumber: tx.block || 0,
                                                                                                                            fee: null,
                                                                                                                            status: 'confirmed',
                                                                                                        },
                                                                                  })
                                                                                  synced++
                                                                } catch (e: any) {
                                                                                  walletResult.errors.push(`tx ${tx.transaction_id}: ${e.message}`)
                                                                }
                                                }
                                  }
                                  walletResult.synced = synced
                      } catch (e: any) {
                                  walletResult.errors.push(`TronGrid: ${e.message}`)
                      }
            }

            results.push(walletResult)
                }

      return NextResponse.json({
              ok: true,
              syncedAt: new Date().toISOString(),
              wallets: results,
      })
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    return GET(req)
}
