'use client'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
}

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}

interface StatsCardsProps {
  totalWallets: number
  totalTokens: number
  totalTransactions: number
}

export default function StatsCards({ totalWallets, totalTokens, totalTransactions }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard title="Wallets" value={totalWallets} subtitle="Tracked wallets" />
      <StatCard title="Tokens" value={totalTokens} subtitle="Whitelisted tokens" />
      <StatCard title="Transactions" value={totalTransactions} subtitle="Total recorded" />
    </div>
  )
}
