'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { shortenAddress } from '@/lib/utils'

interface Token {
  id: string
  network: string
  contract: string
  symbol: string
  decimals: number
  createdAt: string
}

export default function TokenList({ initialTokens }: { initialTokens: Token[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [network, setNetwork] = useState('ERC20')
  const [contract, setContract] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('18')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network,
          contract,
          symbol,
          decimals: parseInt(decimals, 10),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to add token')
        return
      }

      setContract('')
      setSymbol('')
      setDecimals('18')
      setShowForm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this token?')) return

    const res = await fetch(`/api/tokens?id=${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  async function handleFixDecimals() {
    const res = await fetch('/api/tokens', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const data = await res.json()
      alert(`Fixed ${data.fixed} of ${data.total} token(s)`)
      router.refresh()
    } else {
      alert('Failed to fix decimals')
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Token'}
        </button>
        {initialTokens.length > 0 && (
          <button onClick={handleFixDecimals} className="btn-secondary">
            Fix Decimals
          </button>
        )}
      </div>

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
            <label className="label">Contract Address</label>
            <input
              type="text"
              value={contract}
              onChange={(e) => setContract(e.target.value)}
              placeholder="0x... or T..."
              required
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. USDT"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Decimals</label>
            <input
              type="number"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              className="input"
              min="0"
              max="36"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Adding...' : 'Add Token'}
          </button>
        </form>
      )}

      {initialTokens.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No tokens added yet. Add tokens to whitelist for tracking.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="table-header">Network</th>
                <th className="table-header">Symbol</th>
                <th className="table-header">Contract</th>
                <th className="table-header">Decimals</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {initialTokens.map((token) => (
                <tr key={token.id} className="hover:bg-gray-800/50">
                  <td className="table-cell">
                    <span className={token.network === 'ERC20' ? 'badge-erc20' : 'badge-trc20'}>
                      {token.network}
                    </span>
                  </td>
                  <td className="table-cell font-semibold">{token.symbol}</td>
                  <td className="table-cell font-mono text-gray-400">
                    {shortenAddress(token.contract, 10)}
                  </td>
                  <td className="table-cell">{token.decimals}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleDelete(token.id)}
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
