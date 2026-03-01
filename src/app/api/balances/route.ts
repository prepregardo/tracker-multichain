import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { getERC20Balance } from '@/lib/providers/etherscan'
import { getTRC20Balance } from '@/lib/providers/trongrid'

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
            decimals: token.decimals,
            balance,
          })
        } catch {
          results.push({
            wallet: wallet.address,
            walletLabel: wallet.label,
            network: wallet.network,
            token: token.symbol,
            contract: token.contract,
            decimals: token.decimals,
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
