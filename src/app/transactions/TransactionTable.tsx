'use client'

import { useState } from 'react'
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

  const filtered = transactions.filter((tx) => {
    if (filterNetwork !== 'ALL' && tx.network !== filterNetwork) return false
    if (filterDirection !== 'ALL' && tx.direction !== filterDirection) return false
    return true
  })

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/transactions/sync', { method: 'POST' })
      if (res.ok) router.refresh()
      else {
        const data = await res.json()
        alert(data.error || 'Sync failed')
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
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
