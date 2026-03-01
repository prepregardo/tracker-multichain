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

const PAGE_SIZE = 5

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const refresh = req.nextUrl.searchParams.get('refresh') === 'true'
  const page = parseInt(req.nextUrl.searchParams.get('page') || '0', 10)

  try {
    // No refresh — return cached balances from DB
    if (!refresh) {
      const cached = await prisma.balance.findMany({
        orderBy: { updatedAt: 'desc' },
      })

      // Enrich with wallet labels
      const walletAddresses = Array.from(new Set(cached.map((b) => b.wallet)))
      const wallets = await prisma.wallet.findMany({
        where: { address: { in: walletAddresses } },
      })
      const labelMap = new Map(wallets.map((w) => [w.address, w.label]))

      const results = cached.map((b) => ({
        wallet: b.wallet,
        walletLabel: labelMap.get(b.wallet) || null,
        network: b.network,
        token: b.token,
        contract: b.contract,
        decimals: b.decimals,
        balance: b.balance,
        updatedAt: b.updatedAt,
      }))

      return NextResponse.json({ results, cached: true, done: true })
    }

    // Refresh mode — fetch from blockchain and save to DB
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
      error?: string
    }[] = []

    const walletPromises = pageWallets.map(async (wallet) => {
      const walletTokens = tokens.filter((t) => t.network === wallet.network)
      const walletResults: typeof results = []

      for (const token of walletTokens) {
        const decimals = getDecimals(token.contract, token.decimals)

        let balance: string
        try {
          balance = wallet.network === 'ERC20'
            ? await getERC20Balance(wallet.address, token.contract)
            : await getTRC20Balance(wallet.address, token.contract)
        } catch (e: any) {
          walletResults.push({
            wallet: wallet.address,
            walletLabel: wallet.label,
            network: wallet.network,
            token: token.symbol,
            contract: token.contract,
            decimals,
            balance: 'error',
            error: e.message || 'Fetch failed',
          })
          continue
        }

        // Save to DB (non-blocking — don't lose balance if DB fails)
        try {
          await prisma.balance.upsert({
            where: {
              network_wallet_contract: {
                network: wallet.network,
                wallet: wallet.address,
                contract: token.contract,
              },
            },
            update: { balance, token: token.symbol, decimals },
            create: {
              network: wallet.network,
              wallet: wallet.address,
              contract: token.contract,
              token: token.symbol,
              decimals,
              balance,
            },
          })
        } catch {
          // DB save failed (table may not exist) — continue anyway
        }

        walletResults.push({
          wallet: wallet.address,
          walletLabel: wallet.label,
          network: wallet.network,
          token: token.symbol,
          contract: token.contract,
          decimals,
          balance,
        })
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
