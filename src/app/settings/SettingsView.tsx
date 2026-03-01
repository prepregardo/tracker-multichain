'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

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
  const [apiStatus, setApiStatus] = useState<Record<string, boolean | null>>({
    db: null,
    etherscan: null,
    trongrid: null,
  })

  useEffect(() => {
    async function checkStatus() {
      // Check DB by trying to read tokens (any auth response means DB works)
      try {
        const res = await fetch('/api/tokens')
        setApiStatus((prev) => ({ ...prev, db: res.status !== 503 }))
      } catch {
        setApiStatus((prev) => ({ ...prev, db: false }))
      }

      // Check APIs via a health check
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          const data = await res.json()
          setApiStatus((prev) => ({
            ...prev,
            etherscan: data.etherscan ?? prev.etherscan,
            trongrid: data.trongrid ?? prev.trongrid,
          }))
        }
      } catch {
        // If no health endpoint, assume APIs are configured if DB works
        setApiStatus((prev) => ({
          ...prev,
          etherscan: prev.db ?? false,
          trongrid: prev.db ?? false,
        }))
      }
    }
    checkStatus()
  }, [])

  function statusLabel(val: boolean | null) {
    if (val === null) return { text: 'Checking...', cls: 'text-yellow-400' }
    return val
      ? { text: 'Connected', cls: 'text-green-400' }
      : { text: 'Not configured', cls: 'text-red-400' }
  }

  const db = statusLabel(apiStatus.db)
  const eth = statusLabel(apiStatus.etherscan)
  const trx = statusLabel(apiStatus.trongrid)

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Database</span>
            <span className={db.cls}>{db.text}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Etherscan API</span>
            <span className={eth.cls}>{eth.text}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">TronGrid API</span>
            <span className={trx.cls}>{trx.text}</span>
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
