import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const wallets = await prisma.wallet.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(wallets)
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await req.json()
    const { network, address, label } = body

    if (!network || !address) {
      return NextResponse.json({ error: 'network and address are required' }, { status: 400 })
    }

    if (!['ERC20', 'TRC20'].includes(network)) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 })
    }

    const wallet = await prisma.wallet.create({
      data: { network, address, label },
    })

    return NextResponse.json(wallet, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Wallet already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
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
    await prisma.wallet.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }
}
