import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

const MAX_WALLETS = 300

export async function POST(req: NextRequest) {
    const { error } = await requireAdmin()
    if (error) return error

  try {
        const body = await req.json()
        const { network, addresses } = body

      if (!network || !addresses || !Array.isArray(addresses)) {
              return NextResponse.json(
                { error: 'network and addresses array are required' },
                { status: 400 }
                      )
      }

      if (!['ERC20', 'TRC20'].includes(network)) {
              return NextResponse.json({ error: 'Invalid network' }, { status: 400 })
      }

      // Filter out empty lines and trim whitespace
      const cleanAddresses = addresses
          .map((a: string) => a.trim())
          .filter((a: string) => a.length > 0)

      if (cleanAddresses.length === 0) {
              return NextResponse.json(
                { error: 'No valid addresses provided' },
                { status: 400 }
                      )
      }

      if (cleanAddresses.length > MAX_WALLETS) {
              return NextResponse.json(
                { error: `Maximum ${MAX_WALLETS} wallets allowed per batch` },
                { status: 400 }
                      )
      }

      // Check for duplicates in the input
      const uniqueAddresses = Array.from(new Set(cleanAddresses))

      // Find existing wallets to skip them
      const existing = await prisma.wallet.findMany({
              where: {
                        address: { in: uniqueAddresses },
                        network,
              },
              select: { address: true },
      })
        const existingSet = new Set(existing.map((w) => w.address))

      const toCreate = uniqueAddresses.filter((a) => !existingSet.has(a))

      let created = 0
        if (toCreate.length > 0) {
                const result = await prisma.wallet.createMany({
                          data: toCreate.map((address) => ({
                                      network,
                                      address,
                                      label: null,
                          })),
                })
                created = result.count
        }

      return NextResponse.json({
              total: uniqueAddresses.length,
              created,
              skipped: uniqueAddresses.length - created,
              duplicatesInInput: cleanAddresses.length - uniqueAddresses.length,
      }, { status: 201 })
  } catch (e: any) {
        console.error('Bulk wallet creation error:', e)
        return NextResponse.json(
          { error: 'Failed to create wallets' },
          { status: 500 }
              )
  }
}
