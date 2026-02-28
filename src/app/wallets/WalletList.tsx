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

export default function WalletList({ initialWallets }: { initialWallets: Wallet[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [network, setNetwork] = useState('ERC20')
  const [address, setAddress] = useState('')
  const [label, setLabel] = useState('')

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
      setShowForm(false)
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

  return (
    <>
      <button onClick={() => setShowForm(!showForm)} className="btn-primary">
        {showForm ? 'Cancel' : 'Add Wallet'}
      </button>

      {showForm && (
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
