import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const tokens = await prisma.token.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(tokens)
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await req.json()
    const { network, contract, symbol, decimals } = body

    if (!network || !contract || !symbol) {
      return NextResponse.json(
        { error: 'network, contract, and symbol are required' },
        { status: 400 }
      )
    }

    if (!['ERC20', 'TRC20'].includes(network)) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 })
    }

    const token = await prisma.token.create({
      data: {
        network,
        contract,
        symbol,
        decimals: decimals ?? 18,
      },
    })

    return NextResponse.json(token, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Token already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    await prisma.token.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }
}
