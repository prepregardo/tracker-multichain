import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [wallets, tokens, transactions] = await Promise.all([
    prisma.wallet.count(),
    prisma.token.count(),
    prisma.transaction.count(),
  ])

  return NextResponse.json({
    db: !!process.env.DATABASE_URL,
    etherscan: !!process.env.ETHERSCAN_API_KEY,
    trongrid: !!process.env.TRONGRID_API_KEY,
    counts: { wallets, tokens, transactions },
  })
}
