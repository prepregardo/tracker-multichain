import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getERC20Transactions } from '@/lib/providers/etherscan'
import { getTRC20Transactions } from '@/lib/providers/trongrid'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const PAGE_SIZE = 3

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [wallets, tokens] = await Promise.all([
      prisma.wallet.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.token.findMany(),
    ])

    if (wallets.length === 0 || tokens.length === 0) {
      return NextResponse.json({ message: 'No wallets or tokens configured', synced: 0 })
    }

    const totalPages = Math.ceil(wallets.length / PAGE_SIZE)

    // Auto-cycle: pick page based on current 10-minute interval
    const page = Math.floor(Date.now() / (10 * 60 * 1000)) % totalPages

    const pageWallets = wallets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const erc20Tokens = tokens.filter((t) => t.network === 'ERC20')
    const trc20Tokens = tokens.filter((t) => t.network === 'TRC20')

    let totalSynced = 0

    for (const wallet of pageWallets) {
      const matchingTokens = wallet.network === 'ERC20' ? erc20Tokens : trc20Tokens

      for (const token of matchingTokens) {
        try {
          if (wallet.network === 'ERC20') {
            const txs = await getERC20Transactions(wallet.address, token.contract)

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
            }
            totalSynced += txs.length
            await sleep(300)
          }

          if (wallet.network === 'TRC20') {
            const txs = await getTRC20Transactions(wallet.address, token.contract)

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
            }
            totalSynced += txs.length
          }
        } catch {
          // Skip failed wallet/token combo, continue with next
        }
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      page,
      totalPages,
      wallets: pageWallets.map((w) => w.label || w.address.slice(0, 10)),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
