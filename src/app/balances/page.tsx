import { prisma } from '@/lib/prisma'
import BalancesView from './BalancesView'

export const dynamic = 'force-dynamic'

export default async function BalancesPage() {
  let wallets: any[] = []
  let tokens: any[] = []

  try {
    ;[wallets, tokens] = await Promise.all([
      prisma.wallet.findMany({ select: { id: true, address: true, label: true, network: true } }),
      prisma.token.findMany({ select: { id: true, contract: true, symbol: true, decimals: true, network: true } }),
    ])
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Balances</h1>
      </div>
      <BalancesView wallets={wallets} tokens={tokens} />
    </div>
  )
}
