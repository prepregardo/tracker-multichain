import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

// Known decimals for popular tokens (lowercase contract → decimals)
const KNOWN_DECIMALS: Record<string, number> = {
  // ERC20
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,  // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,  // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8,  // WBTC
  // TRC20
  'tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t': 6,           // USDT (TRON)
  'teg2uynjbej5sqhahxmudag8fmtod7v8ss': 6,           // USDC (TRON)
}

function resolveDecimals(contract: string, decimals?: number): number {
  if (decimals !== undefined && decimals !== null) return decimals
  return KNOWN_DECIMALS[contract.toLowerCase()] ?? 18
}

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
        decimals: resolveDecimals(contract, decimals),
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

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await req.json()
    const { id, decimals } = body

    if (id) {
      // Update single token
      const token = await prisma.token.update({
        where: { id },
        data: { decimals },
      })
      return NextResponse.json(token)
    }

    // Auto-fix: update all tokens with known decimals
    const tokens = await prisma.token.findMany()
    let fixed = 0
    for (const token of tokens) {
      const known = KNOWN_DECIMALS[token.contract.toLowerCase()]
      if (known !== undefined && token.decimals !== known) {
        await prisma.token.update({
          where: { id: token.id },
          data: { decimals: known },
        })
        fixed++
      }
    }
    return NextResponse.json({ fixed, total: tokens.length })
  } catch {
    return NextResponse.json({ error: 'Failed to update token' }, { status: 500 })
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
