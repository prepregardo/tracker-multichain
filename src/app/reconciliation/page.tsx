import { prisma } from '@/lib/prisma'
import ReconciliationView from './ReconciliationView'

export const dynamic = 'force-dynamic'

export default async function ReconciliationPage() {
  let records: any[] = []
  let wallets: any[] = []
  let tokens: any[] = []

  try {
    ;[records, wallets, tokens] = await Promise.all([
      prisma.reconciliation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.wallet.findMany({ select: { address: true, label: true, network: true } }),
      prisma.token.findMany({ select: { contract: true, symbol: true, decimals: true, network: true } }),
    ])

    records = records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }))
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Reconciliation</h1>
      </div>
      <ReconciliationView records={records} wallets={wallets} tokens={tokens} />
    </div>
  )
}
