import { prisma } from '@/lib/prisma'
import StatsCards from '@/components/dashboard/StatsCards'
import VolumeChart from '@/components/dashboard/VolumeChart'
import TxChart from '@/components/dashboard/TxChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { format, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let stats = {
    totalWallets: 0,
    totalTokens: 0,
    totalTransactions: 0,
    recentTransactions: [] as any[],
    volumeByNetwork: [] as any[],
    txByDay: [] as any[],
  }

  try {
    const [walletCount, tokenCount, txCount, recentTx, erc20Count, trc20Count] =
      await Promise.all([
        prisma.wallet.count(),
        prisma.token.count(),
        prisma.transaction.count(),
        prisma.transaction.findMany({
          orderBy: { timestamp: 'desc' },
          take: 10,
        }),
        prisma.transaction.count({ where: { network: 'ERC20' } }),
        prisma.transaction.count({ where: { network: 'TRC20' } }),
      ])

    // Transactions by day (last 14 days)
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i)
      return format(date, 'MMM dd')
    })

    const txByDayRaw = await Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const start = subDays(new Date(), 13 - i)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setHours(23, 59, 59, 999)
        return prisma.transaction.count({
          where: { timestamp: { gte: start, lte: end } },
        })
      })
    )

    stats = {
      totalWallets: walletCount,
      totalTokens: tokenCount,
      totalTransactions: txCount,
      recentTransactions: recentTx.map((tx) => ({
        ...tx,
        timestamp: tx.timestamp.toISOString(),
        createdAt: tx.createdAt.toISOString(),
      })),
      volumeByNetwork: [
        { network: 'ERC20', volume: erc20Count },
        { network: 'TRC20', volume: trc20Count },
      ],
      txByDay: days.map((date, i) => ({ date, count: txByDayRaw[i] })),
    }
  } catch {
    // DB not connected yet — show empty state
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <StatsCards
        totalWallets={stats.totalWallets}
        totalTokens={stats.totalTokens}
        totalTransactions={stats.totalTransactions}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VolumeChart data={stats.volumeByNetwork} />
        <TxChart data={stats.txByDay} />
      </div>
      <RecentTransactions transactions={stats.recentTransactions} />
    </div>
  )
}
