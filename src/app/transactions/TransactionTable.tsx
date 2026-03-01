'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { shortenAddress, networkExplorerUrl, formatAmount } from '@/lib/utils'

interface Transaction {
  id: string
  network: string
  hash: string
  wallet: string
  token: string | null
  direction: string
  amount: string
  timestamp: string
  blockNumber: number
  fee: string | null
  status: string
}

interface Wallet {
  address: string
  label: string | null
  network: string
}

function SyncModal({
  open,
  onClose,
  logs,
  progress,
  syncing,
}: {
  open: boolean
  onClose: () => void
  logs: string[]
  progress: { current: number; total: number }
  syncing: boolean
}) {
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!open) return null

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            {syncing ? 'Syncing Transactions...' : 'Sync Complete'}
          </h2>
          {!syncing && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-xl leading-none px-2"
            >
              {'\u00d7'}
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>
              {progress.current} / {progress.total} pages {'\u00b7'} {pct}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${pct}%`,
                background: syncing
                  ? 'linear-gradient(90deg, #6366f1, #818cf8)'
                  : pct === 100
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #6366f1, #818cf8)',
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px] max-h-[400px]">
          <div className="font-mono text-xs leading-relaxed space-y-1">
            {logs.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes('ERROR')
                    ? 'text-red-400'
                    : line.includes('complete') || line.includes('Total:')
                    ? 'text-green-400 font-semibold'
                    : line.includes('Starting') || line.includes('Syncing')
                    ? 'text-brand-400'
                    : line.includes('Found')
                    ? 'text-gray-300'
                    : 'text-gray-400'
                }
              >
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            disabled={syncing}
            className={syncing ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}
          >
            {syncing ? 'Please wait...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TransactionTable({
  transactions,
  wallets,
}: {
  transactions: Transaction[]
  wallets: Wallet[]
}) {
  const router = useRouter()
  const [filterNetwork, setFilterNetwork] = useState<string>('ALL')
  const [filterDirection, setFilterDirection] = useState<string>('ALL')
  const [syncing, setSyncing] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncLogs, setSyncLogs] = useState<string[]>([])
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 })

  const filtered = transactions.filter((tx) => {
    if (filterNetwork !== 'ALL' && tx.network !== filterNetwork) return false
    if (filterDirection !== 'ALL' && tx.direction !== filterDirection) return false
    return true
  })

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncModalOpen(true)
    setSyncLogs([])
    setSyncProgress({ current: 0, total: 0 })

    let page = 0
    let totalSynced = 0
    let hasError = false

    try {
      while (true) {
        const res = await fetch(`/api/transactions/sync?page=${page}`, { method: 'POST' })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const errLogs = data.logs || [`ERROR: ${data.error || res.statusText}`]
          setSyncLogs((prev) => [...prev, ...errLogs])
          hasError = true
          break
        }

        const data = await res.json()

        // Append logs from this page
        if (data.logs && data.logs.length > 0) {
          setSyncLogs((prev) => [...prev, ...data.logs])
        }

        totalSynced += data.synced || 0
        setSyncProgress({ current: page + 1, total: data.totalPages })

        if (data.done) break
        page++
      }

      // Final summary
      if (!hasError) {
        setSyncLogs((prev) => [...prev, `Sync complete. Total: ${totalSynced} transactions.`])
        router.refresh()
      }
    } catch (e: any) {
      setSyncLogs((prev) => [...prev, `ERROR: ${e.message}`])
    }

    setSyncing(false)
  }, [router])

  function handleCloseModal() {
    setSyncModalOpen(false)
  }

  return (
    <>
      <SyncModal
        open={syncModalOpen}
        onClose={handleCloseModal}
        logs={syncLogs}
        progress={syncProgress}
        syncing={syncing}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleSync} disabled={syncing} className="btn-primary">
          {syncing ? 'Syncing...' : 'Sync Transactions'}
        </button>

        <select
          value={filterNetwork}
          onChange={(e) => setFilterNetwork(e.target.value)}
          className="input w-auto"
        >
          <option value="ALL">All Networks</option>
          <option value="ERC20">ERC20</option>
          <option value="TRC20">TRC20</option>
        </select>

        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value)}
          className="input w-auto"
        >
          <option value="ALL">All Directions</option>
          <option value="IN">Incoming</option>
          <option value="OUT">Outgoing</option>
        </select>

        <span className="text-sm text-gray-500">{filtered.length} transactions</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {transactions.length === 0
              ? 'No transactions yet. Add wallets and click "Sync Transactions".'
              : 'No transactions match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header">Network</th>
                  <th className="table-header">Hash</th>
                  <th className="table-header">Wallet</th>
                  <th className="table-header">Direction</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Block</th>
                  <th className="table-header">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((tx) => {
                  const walletInfo = wallets.find(
                    (w) => w.address.toLowerCase() === tx.wallet.toLowerCase()
                  )
                  return (
                    <tr key={tx.id} className="hover:bg-gray-800/50">
                      <td className="table-cell">
                        <span className={tx.network === 'ERC20' ? 'badge-erc20' : 'badge-trc20'}>
                          {tx.network}
                        </span>
                      </td>
                      <td className="table-cell">
                        <a
                          href={networkExplorerUrl(tx.network, tx.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-brand-400 hover:text-brand-300"
                        >
                          {shortenAddress(tx.hash, 8)}
                        </a>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-sm">
                          {walletInfo?.label || shortenAddress(tx.wallet)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={tx.direction === 'IN' ? 'badge-in' : 'badge-out'}>
                          {tx.direction}
                        </span>
                      </td>
                      <td className="table-cell font-mono">{formatAmount(tx.amount)}</td>
                      <td className="table-cell text-gray-500">{tx.blockNumber}</td>
                      <td className="table-cell text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
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
