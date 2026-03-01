import BalancesView from './BalancesView'

export const dynamic = 'force-dynamic'

export default function BalancesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Balances</h1>
      </div>
      <BalancesView />
    </div>
  )
}
