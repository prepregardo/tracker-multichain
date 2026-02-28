import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { getERC20Balance } from '@/lib/providers/etherscan'
import { getTRC20Balance } from '@/lib/providers/trongrid'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const records = await prisma.reconciliation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(records)
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 })
  }
}

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const wallets = await prisma.wallet.findMany()
    const tokens = await prisma.token.findMany()
    const results: any[] = []

    for (const wallet of wallets) {
      // Check native balance
      try {
        let actualBalance = '0'
        if (wallet.network === 'ERC20') {
          actualBalance = await getERC20Balance(wallet.address)
        } else {
          actualBalance = await getTRC20Balance(wallet.address)
        }

        // Calculate expected from transactions
        const txs = await prisma.transaction.findMany({
          where: {
            wallet: wallet.address,
            network: wallet.network,
            token: null,
          },
        })

        let expected = BigInt(0)
        for (const tx of txs) {
          if (tx.direction === 'IN') expected += BigInt(tx.amount)
          else expected -= BigInt(tx.amount)
        }

        const difference = String(BigInt(actualBalance) - expected)

        const record = await prisma.reconciliation.create({
          data: {
            wallet: wallet.address,
            network: wallet.network,
            token: null,
            expectedBalance: expected.toString(),
            actualBalance,
            difference,
            status: difference === '0' ? 'ok' : 'mismatch',
          },
        })
        results.push(record)
      } catch (e) {
        console.error(`Reconciliation failed for ${wallet.address}:`, e)
      }

      // Check token balances
      const walletTokens = tokens.filter((t) => t.network === wallet.network)
      for (const token of walletTokens) {
        try {
          let actualBalance = '0'
          if (wallet.network === 'ERC20') {
            actualBalance = await getERC20Balance(wallet.address, token.contract)
          } else {
            actualBalance = await getTRC20Balance(wallet.address, token.contract)
          }

          const txs = await prisma.transaction.findMany({
            where: {
              wallet: wallet.address,
              network: wallet.network,
              token: token.contract,
            },
          })

          let expected = BigInt(0)
          for (const tx of txs) {
            if (tx.direction === 'IN') expected += BigInt(tx.amount)
            else expected -= BigInt(tx.amount)
          }

          const difference = String(BigInt(actualBalance) - expected)

          const record = await prisma.reconciliation.create({
            data: {
              wallet: wallet.address,
              network: wallet.network,
              token: token.symbol,
              expectedBalance: expected.toString(),
              actualBalance,
              difference,
              status: difference === '0' ? 'ok' : 'mismatch',
            },
          })
          results.push(record)
        } catch (e) {
          console.error(`Token reconciliation failed for ${wallet.address}/${token.symbol}:`, e)
        }
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch {
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
