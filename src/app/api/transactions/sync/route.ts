import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { getERC20Transactions } from '@/lib/providers/etherscan'
import { getTRC20Transactions } from '@/lib/providers/trongrid'

export const maxDuration = 60

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
        const [wallets, tokens] = await Promise.all([
          prisma.wallet.findMany(),
          prisma.token.findMany(),
        ])

        if (wallets.length === 0) {
          send('log', { message: 'No wallets found. Add wallets first.' })
          send('done', { ok: true, synced: 0 })
          controller.close()
          return
        }

        if (tokens.length === 0) {
          send('log', { message: 'No tokens found. Add tokens (USDT, USDC) first.' })
          send('done', { ok: true, synced: 0 })
          controller.close()
          return
        }

        const erc20Tokens = tokens.filter((t) => t.network === 'ERC20')
        const trc20Tokens = tokens.filter((t) => t.network === 'TRC20')

        // Build work items: each wallet × each matching token
        const workItems: { wallet: typeof wallets[0]; token: typeof tokens[0] }[] = []
        for (const wallet of wallets) {
          const matchingTokens = wallet.network === 'ERC20' ? erc20Tokens : trc20Tokens
          for (const token of matchingTokens) {
            workItems.push({ wallet, token })
          }
        }

        send('log', { message: `Starting sync: ${wallets.length} wallet(s), ${tokens.length} token(s), ${workItems.length} task(s)` })
        send('progress', { current: 0, total: workItems.length })

        let totalSynced = 0

        for (let i = 0; i < workItems.length; i++) {
          const { wallet, token } = workItems[i]
          const label = wallet.label || wallet.address.slice(0, 10) + '...'

          send('log', { message: `[${i + 1}/${workItems.length}] ${label} — ${token.symbol} (${wallet.network})` })

          try {
            if (wallet.network === 'ERC20') {
              // Fetch only transactions for this specific token contract
              const txs = await getERC20Transactions(wallet.address, token.contract)
              send('log', { message: `  Found ${txs.length} ${token.symbol} transactions` })

              let saved = 0
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
                    token: tx.contractAddress || token.contract,
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
                saved++
              }
              totalSynced += saved
              send('log', { message: `  Saved ${saved} transactions` })

              // Etherscan rate limit: ~5 calls/sec
              await sleep(250)
            }

            if (wallet.network === 'TRC20') {
              // Fetch only transactions for this specific token contract
              const txs = await getTRC20Transactions(wallet.address, token.contract)
              send('log', { message: `  Found ${txs.length} ${token.symbol} transactions` })

              let saved = 0
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
                    token: tx.token_info?.address || token.contract,
                    direction,
                    amount: tx.value,
                    timestamp: new Date(tx.block_timestamp),
                    blockNumber: tx.block,
                    fee: null,
                    status: 'confirmed',
                  },
                })
                saved++
              }
              totalSynced += saved
              send('log', { message: `  Saved ${saved} transactions` })
            }
          } catch (e: any) {
            send('log', { message: `  ERROR: ${e.message}` })
          }

          send('progress', { current: i + 1, total: workItems.length })
        }

        send('log', { message: `Sync complete. Total: ${totalSynced} transactions.` })
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
