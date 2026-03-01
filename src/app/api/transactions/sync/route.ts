import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { getERC20Transactions } from '@/lib/providers/etherscan'
import { getTRC20Transactions } from '@/lib/providers/trongrid'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const PAGE_SIZE = 3 // 3 wallets per request — fits in 10s Vercel timeout

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const page = parseInt(req.nextUrl.searchParams.get('page') || '0', 10)

  try {
    const [wallets, tokens] = await Promise.all([
      prisma.wallet.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.token.findMany(),
    ])

    if (wallets.length === 0) {
      return NextResponse.json({
        logs: ['No wallets found. Add wallets first.'],
        synced: 0,
        page,
        totalPages: 0,
        done: true,
      })
    }

    if (tokens.length === 0) {
      return NextResponse.json({
        logs: ['No tokens found. Add tokens (USDT, USDC) first.'],
        synced: 0,
        page,
        totalPages: 0,
        done: true,
      })
    }

    const totalPages = Math.ceil(wallets.length / PAGE_SIZE)
    const pageWallets = wallets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    if (pageWallets.length === 0) {
      return NextResponse.json({
        logs: [],
        synced: 0,
        page,
        totalPages,
        done: true,
      })
    }

    const erc20Tokens = tokens.filter((t) => t.network === 'ERC20')
    const trc20Tokens = tokens.filter((t) => t.network === 'TRC20')

    const logs: string[] = []
    let totalSynced = 0

    for (const wallet of pageWallets) {
      const matchingTokens = wallet.network === 'ERC20' ? erc20Tokens : trc20Tokens
      const label = wallet.label || wallet.address.slice(0, 10) + '...'

      for (const token of matchingTokens) {
        logs.push(`${label} — ${token.symbol} (${wallet.network})`)

        try {
          if (wallet.network === 'ERC20') {
            const txs = await getERC20Transactions(wallet.address, token.contract)
            logs.push(`  Found ${txs.length} ${token.symbol} transactions`)

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
            logs.push(`  Saved ${saved} transactions`)

            // Rate limit: wait between Etherscan calls
            await sleep(300)
          }

          if (wallet.network === 'TRC20') {
            const txs = await getTRC20Transactions(wallet.address, token.contract)
            logs.push(`  Found ${txs.length} ${token.symbol} transactions`)

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
            logs.push(`  Saved ${saved} transactions`)
          }
        } catch (e: any) {
          logs.push(`  ERROR: ${e.message}`)
        }
      }
    }

    const done = page + 1 >= totalPages

    return NextResponse.json({
      logs,
      synced: totalSynced,
      page,
      totalPages,
      done,
    })
  } catch (e: any) {
    return NextResponse.json({
      logs: [`FATAL ERROR: ${e.message}`],
      synced: 0,
      page,
      totalPages: 0,
      done: true,
      error: e.message,
    }, { status: 500 })
  }
}
