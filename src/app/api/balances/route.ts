import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { getERC20Balance } from '@/lib/providers/etherscan'
import { getTRC20Balance } from '@/lib/providers/trongrid'

export const maxDuration = 60

// Known decimals fallback (lowercase contract → decimals)
const KNOWN_DECIMALS: Record<string, number> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,  // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,  // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8,  // WBTC
  'tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t': 6,           // USDT (TRON)
  'teg2uynjbej5sqhahxmudag8fmtod7v8ss': 6,           // USDC (TRON)
}

function getDecimals(contract: string, dbDecimals: number): number {
  const known = KNOWN_DECIMALS[contract.toLowerCase()]
  if (known !== undefined && dbDecimals === 18 && known !== 18) return known
  return dbDecimals
}

interface BalanceTask {
  wallet: string
  walletLabel: string | null
  network: string
  token: string
  contract: string | null
  decimals: number
  fetchFn: () => Promise<string>
}

// Process tasks in batches with delay between batches (Etherscan: 5 calls/sec)
async function processBatched(tasks: BalanceTask[], batchSize = 4, delayMs = 250) {
  const results: {
    wallet: string
    walletLabel: string | null
    network: string
    token: string
    contract: string | null
    decimals: number
    balance: string
  }[] = []

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(async (task) => {
        const balance = await task.fetchFn()
        return {
          wallet: task.wallet,
          walletLabel: task.walletLabel,
          network: task.network,
          token: task.token,
          contract: task.contract,
          decimals: task.decimals,
          balance,
        }
      })
    )

    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j]
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        results.push({
          wallet: batch[j].wallet,
          walletLabel: batch[j].walletLabel,
          network: batch[j].network,
          token: batch[j].token,
          contract: batch[j].contract,
          decimals: batch[j].decimals,
          balance: 'error',
        })
      }
    }

    // Rate limit: wait between batches
    if (i + batchSize < tasks.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return results
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const [wallets, tokens] = await Promise.all([
      prisma.wallet.findMany(),
      prisma.token.findMany(),
    ])

    if (wallets.length === 0) {
      return NextResponse.json([])
    }

    // Build all tasks upfront, then process in batches
    const tasks: BalanceTask[] = []

    for (const wallet of wallets) {
      // Token balances only (skip native ETH/TRX — focus on USDT/USDC)
      const walletTokens = tokens.filter((t) => t.network === wallet.network)
      for (const token of walletTokens) {
        tasks.push({
          wallet: wallet.address,
          walletLabel: wallet.label,
          network: wallet.network,
          token: token.symbol,
          contract: token.contract,
          decimals: getDecimals(token.contract, token.decimals),
          fetchFn: () =>
            wallet.network === 'ERC20'
              ? getERC20Balance(wallet.address, token.contract)
              : getTRC20Balance(wallet.address, token.contract),
        })
      }
    }

    if (tasks.length === 0) {
      return NextResponse.json([])
    }

    const results = await processBatched(tasks)
    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  }
}
