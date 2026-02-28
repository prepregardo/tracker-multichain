import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const network = req.nextUrl.searchParams.get('network')
  const wallet = req.nextUrl.searchParams.get('wallet')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10)

  try {
    const where: any = {}
    if (network) where.network = network
    if (wallet) where.wallet = wallet

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
    })

    return NextResponse.json(transactions)
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 })
  }
}
