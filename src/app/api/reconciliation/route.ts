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

                        const record = await prisma.reconciliation.create({
                                    data: {
                                                  wallet: wallet.address,
                                                  network: wallet.network,
                                                  token: null,
                                                  expectedBalance: '0',
                                                  actualBalance,
                                                  difference: '0',
                                                  status: 'ok',
                                    },
                        })
                    results.push(record)
          } catch (e) {
                    console.error(`Balance check failed for ${wallet.address}:`, e)
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

                                  const record = await prisma.reconciliation.create({
                                                data: {
                                                                wallet: wallet.address,
                                                                network: wallet.network,
                                                                token: token.symbol,
                                                                expectedBalance: '0',
                                                                actualBalance,
                                                                difference: '0',
                                                                status: 'ok',
                                                },
                                  })
                                            results.push(record)
                                } catch (e) {
                                            console.error(`Token balance check failed for ${wallet.address}/${token.symbol}:`, e)
                                }
                      }
              }

      return NextResponse.json({ ok: true, results })
  } catch {
        return NextResponse.json({ error: 'Balance check failed' }, { status: 500 })
  }
}
