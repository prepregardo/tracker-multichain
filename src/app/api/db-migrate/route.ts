import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create Balance table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Balance" (
        "id" TEXT NOT NULL,
        "network" TEXT NOT NULL,
        "wallet" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "contract" TEXT NOT NULL,
        "decimals" INTEGER NOT NULL DEFAULT 18,
        "balance" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
      )
    `)

    // Create unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Balance_network_wallet_contract_key"
      ON "Balance"("network", "wallet", "contract")
    `)

    // Create wallet index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Balance_wallet_idx"
      ON "Balance"("wallet")
    `)

    return NextResponse.json({ success: true, message: 'Balance table created' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
