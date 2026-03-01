import { NextResponse } from 'next/server'
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
  // If DB has default 18 but we know the real value, use the known one
  if (known !== undefined && dbDecimals === 18 && known !== 18) return known
  return dbDecimals
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

    const results: {
      wallet: string
      walletLabel: string | null
      network: string
      token: string
      contract: string | null
      decimals: number
      balance: string
    }[] = []

    for (const wallet of wallets) {
      // Native balance
      try {
        let balance = '0'
        if (wallet.network === 'ERC20') {
          balance = await getERC20Balance(wallet.address)
        } else if (wallet.network === 'TRC20') {
          balance = await getTRC20Balance(wallet.address)
        }
        results.push({
          wallet: wallet.address,
          walletLabel: wallet.label,
          network: wallet.network,
          token: wallet.network === 'ERC20' ? 'ETH' : 'TRX',
          contract: null,
          decimals: wallet.network === 'ERC20' ? 18 : 6,
          balance,
        })
      } catch {
        results.push({
          wallet: wallet.address,
          walletLabel: wallet.label,
          network: wallet.network,
          token: wallet.network === 'ERC20' ? 'ETH' : 'TRX',
          contract: null,
          decimals: wallet.network === 'ERC20' ? 18 : 6,
          balance: 'error',
        })
      }

      // Token balances for matching network
      const walletTokens = tokens.filter((t) => t.network === wallet.network)
      for (const token of walletTokens) {
        try {
          let balance = '0'
          if (wallet.network === 'ERC20') {
            balance = await getERC20Balance(wallet.address, token.contract)
          } else if (wallet.network === 'TRC20') {
            balance = await getTRC20Balance(wallet.address, token.contract)
          }
          results.push({
            wallet: wallet.address,
            walletLabel: wallet.label,
            network: wallet.network,
            token: token.symbol,
            contract: token.contract,
            decimals: getDecimals(token.contract, token.decimals),
            balance,
          })
        } catch {
          results.push({
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
    }

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  }
}
