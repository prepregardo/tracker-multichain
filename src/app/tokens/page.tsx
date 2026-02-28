import { prisma } from '@/lib/prisma'
import TokenList from './TokenList'

export const dynamic = 'force-dynamic'

export default async function TokensPage() {
  let tokens: any[] = []

  try {
    tokens = await prisma.token.findMany({
      orderBy: { createdAt: 'desc' },
    })
    tokens = tokens.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }))
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tokens</h1>
      </div>
      <TokenList initialTokens={tokens} />
    </div>
  )
}
