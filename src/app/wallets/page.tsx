import { prisma } from '@/lib/prisma'
import WalletList from './WalletList'

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  let wallets: any[] = []

  try {
    wallets = await prisma.wallet.findMany({
      orderBy: { createdAt: 'desc' },
    })
    wallets = wallets.map((w) => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }))
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Wallets</h1>
      </div>
      <WalletList initialWallets={wallets} />
    </div>
  )
}
