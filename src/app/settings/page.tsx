import { prisma } from '@/lib/prisma'
import SettingsView from './SettingsView'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let users: any[] = []

  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })
    users = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }))
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <SettingsView users={users} />
    </div>
  )
}
