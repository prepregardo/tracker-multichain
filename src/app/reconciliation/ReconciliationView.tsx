'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { shortenAddress } from '@/lib/utils'

interface ReconciliationRecord {
  id: string
  wallet: string
  network: string
  token: string | null
  expectedBalance: string
  actualBalance: string
  difference: string
  status: string
  createdAt: string
}

interface Wallet {
  address: string
  label: string | null
  network: string
}

export default function ReconciliationView({
  records,
  wallets,
}: {
  records: ReconciliationRecord[]
  wallets: Wallet[]
}) {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function handleRun() {
    setRunning(true)
    try {
      const res = await fetch('/api/reconciliation', { method: 'POST' })
      if (res.ok) router.refresh()
      else {
        const data = await res.json()
        alert(data.error || 'Reconciliation failed')
      }
    } finally {
      setRunning(false)
    }
  }

  const mismatches = records.filter((r) => r.difference !== '0' && r.status !== 'ok')

  return (
    <>
      <div className="flex items-center gap-4">
        <button onClick={handleRun} disabled={running} className="btn-primary">
          {running ? 'Running...' : 'Run Reconciliation'}
        </button>
        {records.length > 0 && (
          <span className="text-sm text-gray-500">
            {mismatches.length === 0
              ? 'All balances match'
              : `${mismatches.length} mismatch(es) found`}
          </span>
        )}
      </div>

      {records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            No reconciliation records. Add wallets and click &quot;Run Reconciliation&quot;.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header">Network</th>
                  <th className="table-header">Wallet</th>
                  <th className="table-header">Token</th>
                  <th className="table-header">Expected</th>
                  <th className="table-header">Actual</th>
                  <th className="table-header">Difference</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {records.map((record) => {
                  const walletInfo = wallets.find(
                    (w) => w.address.toLowerCase() === record.wallet.toLowerCase()
                  )
                  const hasMismatch = record.difference !== '0' && record.status !== 'ok'

                  return (
                    <tr
                      key={record.id}
                      className={hasMismatch ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-gray-800/50'}
                    >
                      <td className="table-cell">
                        <span className={record.network === 'ERC20' ? 'badge-erc20' : 'badge-trc20'}>
                          {record.network}
                        </span>
                      </td>
                      <td className="table-cell font-mono">
                        {walletInfo?.label || shortenAddress(record.wallet)}
                      </td>
                      <td className="table-cell">{record.token || 'Native'}</td>
                      <td className="table-cell font-mono">{record.expectedBalance}</td>
                      <td className="table-cell font-mono">{record.actualBalance}</td>
                      <td className={`table-cell font-mono ${hasMismatch ? 'text-red-400' : 'text-green-400'}`}>
                        {record.difference}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${
                            hasMismatch
                              ? 'bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20'
                              : 'bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20'
                          }`}
                        >
                          {hasMismatch ? 'Mismatch' : 'OK'}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
