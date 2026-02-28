import { prisma } from '@/lib/prisma'
import TransactionTable from './TransactionTable'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  let transactions: any[] = []
  let wallets: any[] = []

  try {
    ;[transactions, wallets] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      prisma.wallet.findMany({ select: { address: true, label: true, network: true } }),
    ])
    transactions = transactions.map((tx) => ({
      ...tx,
      timestamp: tx.timestamp.toISOString(),
      createdAt: tx.createdAt.toISOString(),
    }))
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
      </div>
      <TransactionTable transactions={transactions} wallets={wallets} />
    </div>
  )
}
