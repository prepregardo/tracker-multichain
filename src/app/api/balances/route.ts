import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { getERC20Balance } from '@/lib/providers/etherscan'
import { getTRC20Balance } from '@/lib/providers/trongrid'

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

const PAGE_SIZE = 5 // 5 wallets per page × 2 tokens = 10 API calls, ~3 sec

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const page = parseInt(req.nextUrl.searchParams.get('page') || '0', 10)

  try {
    const [wallets, tokens] = await Promise.all([
      prisma.wallet.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.token.findMany(),
    ])

    const totalPages = Math.ceil(wallets.length / PAGE_SIZE)
    const pageWallets = wallets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    if (pageWallets.length === 0) {
      return NextResponse.json({ results: [], page, totalPages, done: true })
    }

    const results: {
      wallet: string
      walletLabel: string | null
      network: string
      token: string
      contract: string | null
      decimals: number
      balance: string
    }[] = []

    // Process wallets in this page with parallel requests per wallet
    const walletPromises = pageWallets.map(async (wallet) => {
      const walletTokens = tokens.filter((t) => t.network === wallet.network)
      const walletResults: typeof results = []

      for (const token of walletTokens) {
        try {
          const balance = wallet.network === 'ERC20'
            ? await getERC20Balance(wallet.address, token.contract)
            : await getTRC20Balance(wallet.address, token.contract)

          walletResults.push({
            wallet: wallet.address,
            walletLabel: wallet.label,
            network: wallet.network,
            token: token.symbol,
            contract: token.contract,
            decimals: getDecimals(token.contract, token.decimals),
            balance,
          })
        } catch {
          walletResults.push({
            wallet: wallet.address,
            walletLabel: wallet.label,
            network: wallet.network,
            token: token.symbol,
            contract: token.contract,
            decimals: getDecimals(token.contract, token.decimals),
            balance: 'error',
          })
        }
      }

      return walletResults
    })

    const allResults = await Promise.all(walletPromises)
    for (const wr of allResults) {
      results.push(...wr)
    }

    return NextResponse.json({
      results,
      page,
      totalPages,
      done: page + 1 >= totalPages,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  }
}
