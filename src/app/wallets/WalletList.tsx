'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { shortenAddress, addressExplorerUrl } from '@/lib/utils'

interface Wallet {
  id: string
  network: string
  address: string
  label: string | null
  createdAt: string
}

type FormMode = 'single' | 'bulk' | null

export default function WalletList({ initialWallets }: { initialWallets: Wallet[] }) {
  const router = useRouter()
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [loading, setLoading] = useState(false)
  const [network, setNetwork] = useState('ERC20')
  const [address, setAddress] = useState('')
  const [label, setLabel] = useState('')
  
  // Bulk add state
  const [bulkAddresses, setBulkAddresses] = useState('')
  const [bulkNetwork, setBulkNetwork] = useState('ERC20')
  const [bulkResult, setBulkResult] = useState<{
    total: number
    created: number
    skipped: number
    duplicatesInInput: number
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, address, label: label || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to add wallet')
        return
      }

      setAddress('')
      setLabel('')
      setFormMode(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setBulkResult(null)

    try {
      const addresses = bulkAddresses.split('\n')
      
      const res = await fetch('/api/wallets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: bulkNetwork, addresses }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || 'Failed to add wallets')
        return
      }

      setBulkResult(data)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this wallet?')) return

    const res = await fetch(`/api/wallets?id=${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  const addressCount = bulkAddresses
    .split('\n')
    .filter((line) => line.trim().length > 0).length

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setFormMode(formMode === 'single' ? null : 'single')}
          className="btn-primary"
        >
          {formMode === 'single' ? 'Cancel' : 'Add Wallet'}
        </button>
        <button
          onClick={() => {
            setFormMode(formMode === 'bulk' ? null : 'bulk')
            setBulkResult(null)
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            formMode === 'bulk'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
          }`}
        >
          {formMode === 'bulk' ? 'Cancel' : 'Bulk Add (up to 300)'}
        </button>
      </div>

      {formMode === 'single' && (
        <form onSubmit={handleSubmit} className="card max-w-lg space-y-4">
          <div>
            <label className="label">Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="input"
            >
              <option value="ERC20">ERC20 (Ethereum)</option>
              <option value="TRC20">TRC20 (TRON)</option>
            </select>
          </div>
          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... or T..."
              required
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Hot Wallet"
              className="input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Adding...' : 'Add Wallet'}
          </button>
        </form>
      )}

      {formMode === 'bulk' && (
        <form onSubmit={handleBulkSubmit} className="card max-w-2xl space-y-4">
          <div>
            <label className="label">Network (for all wallets)</label>
            <select
              value={bulkNetwork}
              onChange={(e) => setBulkNetwork(e.target.value)}
              className="input"
            >
              <option value="ERC20">ERC20 (Ethereum)</option>
              <option value="TRC20">TRC20 (TRON)</option>
            </select>
          </div>
          <div>
            <label className="label">
              Wallet Addresses (one per line, max 300)
            </label>
            <textarea
              value={bulkAddresses}
              onChange={(e) => setBulkAddresses(e.target.value)}
              placeholder={"0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B\n0x1234567890abcdef1234567890abcdef12345678\n0xdead000000000000000000000000000000000000\n..."}
              rows={12}
              className="input font-mono text-sm resize-y"
            />
            <div className="flex justify-between mt-2 text-sm">
              <span className={`${addressCount > 300 ? 'text-red-400' : 'text-gray-500'}`}>
                {addressCount} address{addressCount !== 1 ? 'es' : ''} entered
              </span>
              {addressCount > 300 && (
                <span className="text-red-400">Maximum 300 allowed</span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || addressCount === 0 || addressCount > 300}
            className="btn-primary"
          >
            {loading ? 'Adding wallets...' : `Add ${addressCount} Wallet${addressCount !== 1 ? 's' : ''}`}
          </button>

          {bulkResult && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-1">
              <p className="text-green-400 font-medium">Bulk import complete!</p>
              <p className="text-sm text-gray-300">
                Created: <span className="text-green-400 font-mono">{bulkResult.created}</span>
              </p>
              <p className="text-sm text-gray-300">
                Already existed (skipped): <span className="text-yellow-400 font-mono">{bulkResult.skipped}</span>
              </p>
              {bulkResult.duplicatesInInput > 0 && (
                <p className="text-sm text-gray-300">
                  Duplicates in input: <span className="text-orange-400 font-mono">{bulkResult.duplicatesInInput}</span>
                </p>
              )}
              <p className="text-sm text-gray-300">
                Total unique: <span className="text-gray-100 font-mono">{bulkResult.total}</span>
              </p>
            </div>
          )}
        </form>
      )}

      {initialWallets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No wallets added yet. Add your first wallet to start tracking.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="table-header">Network</th>
                <th className="table-header">Address</th>
                <th className="table-header">Label</th>
                <th className="table-header">Added</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {initialWallets.map((wallet) => (
                <tr key={wallet.id} className="hover:bg-gray-800/50">
                  <td className="table-cell">
                    <span className={wallet.network === 'ERC20' ? 'badge-erc20' : 'badge-trc20'}>
                      {wallet.network}
                    </span>
                  </td>
                  <td className="table-cell">
                    <a
                      href={addressExplorerUrl(wallet.network, wallet.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-brand-400 hover:text-brand-300"
                    >
                      {shortenAddress(wallet.address, 10)}
                    </a>
                  </td>
                  <td className="table-cell">{wallet.label || '-'}</td>
                  <td className="table-cell text-gray-500">
                    {new Date(wallet.createdAt).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleDelete(wallet.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
