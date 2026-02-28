'use client'

import { useSession } from 'next-auth/react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
}

export default function SettingsView({ users }: { users: User[] }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Etherscan API</span>
            <span className="text-green-400">
              {process.env.NEXT_PUBLIC_HAS_ETHERSCAN === 'true' ? 'Connected' : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">TronGrid API</span>
            <span className="text-green-400">
              {process.env.NEXT_PUBLIC_HAS_TRONGRID === 'true' ? 'Connected' : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Database</span>
            <span className="text-green-400">
              {process.env.NEXT_PUBLIC_HAS_DB === 'true' ? 'Connected' : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && users.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Team Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50">
                    <td className="table-cell">{user.name || '-'}</td>
                    <td className="table-cell text-gray-400">{user.email}</td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20'
                            : 'bg-gray-500/10 text-gray-400 ring-1 ring-inset ring-gray-500/20'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
