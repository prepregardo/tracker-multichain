'use client'

import { useState } from 'react'
import Link from 'next/link'
import { shortenAddress, formatAmount, addressExplorerUrl } from '@/lib/utils'

interface WalletInfo {
  id: string
  address: string
  label: string | null
  network: string
}

interface TokenInfo {
  id: string
  contract: string
  symbol: string
  decimals: number
  network: string
}

interface BalanceRow {
  wallet: string
  walletLabel: string | null
  network: string
  token: string
  contract: string | null
  decimals: number
  balance: string
}

interface Props {
  wallets: WalletInfo[]
  tokens: TokenInfo[]
}

export default function BalancesView({ wallets, tokens }: Props) {
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [filterNetwork, setFilterNetwork] = useState('')
  const [filterToken, setFilterToken] = useState('')

  const hasWallets = wallets.length > 0
  const hasTokens = tokens.length > 0

  async function fetchBalances() {
    setLoading(true)
    try {
      const res = await fetch('/api/balances')
      if (res.ok) {
        const data = await res.json()
        setBalances(data)
        setLoaded(true)
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Failed to fetch balances')
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = balances.filter((b) => {
    if (filterNetwork && b.network !== filterNetwork) return false
    if (filterToken && b.token !== filterToken) return false
    return true
  })

  const networks = [...new Set(balances.map((b) => b.network))]
  const tokenSymbols = [...new Set(balances.map((b) => b.token))]

  const nonZero = filtered.filter((b) => b.balance !== '0' && b.balance !== 'error')
  const errors = filtered.filter((b) => b.balance === 'error')

  // Show setup hints if no wallets or tokens
  if (!hasWallets) {
    return (
      <div className="card text-center py-16 space-y-4">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-gray-400 text-lg">No wallets added yet</p>
        <p className="text-gray-500 text-sm">
          Add wallets first, then come back to check balances.
        </p>
        <Link href="/wallets" className="btn-primary inline-block mt-4">
          Go to Wallets
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Wallets</p>
          <p className="text-2xl font-bold text-white">{wallets.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Tokens</p>
          <p className="text-2xl font-bold text-white">{tokens.length}</p>
          {!hasTokens && (
            <Link href="/tokens" className="text-xs text-brand-400 hover:underline">
              Add tokens
            </Link>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Non-zero Balances</p>
          <p className="text-2xl font-bold text-white">{loaded ? nonZero.length : '—'}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={fetchBalances} disabled={loading} className="btn-primary">
          {loading ? 'Loading...' : loaded ? 'Refresh Balances' : 'Fetch Balances'}
        </button>
        {loaded && errors.length > 0 && (
          <span className="text-sm text-red-400">
            {errors.length} error(s)
          </span>
        )}
      </div>

      {loaded && balances.length > 0 && (
        <div className="flex gap-3">
          <select
            value={filterNetwork}
            onChange={(e) => setFilterNetwork(e.target.value)}
            className="input w-40"
          >
            <option value="">All Networks</option>
            {networks.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={filterToken}
            onChange={(e) => setFilterToken(e.target.value)}
            className="input w-40"
          >
            <option value="">All Tokens</option>
            {tokenSymbols.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {!loaded ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            Click &quot;Fetch Balances&quot; to load real-time balances from blockchain.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Will check {wallets.length} wallet(s) × {tokens.length + 1} token(s) (including native)
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No balances found matching filters.</p>
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
                  <th className="table-header text-right">Balance</th>
                  <th className="table-header text-right">Raw</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((row, i) => {
                  const isError = row.balance === 'error'
                  const isZero = row.balance === '0'

                  return (
                    <tr
                      key={`${row.wallet}-${row.token}-${i}`}
                      className={
                        isError
                          ? 'bg-red-500/5 hover:bg-red-500/10'
                          : isZero
                            ? 'opacity-50 hover:bg-gray-800/50'
                            : 'hover:bg-gray-800/50'
                      }
                    >
                      <td className="table-cell">
                        <span className={row.network === 'ERC20' ? 'badge-erc20' : 'badge-trc20'}>
                          {row.network}
                        </span>
                      </td>
                      <td className="table-cell font-mono">
                        <a
                          href={addressExplorerUrl(row.network, row.wallet)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-brand-400 transition-colors"
                        >
                          {row.walletLabel || shortenAddress(row.wallet)}
                        </a>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-white">{row.token}</span>
                        {row.contract && (
                          <span className="ml-2 text-xs text-gray-500 font-mono">
                            {shortenAddress(row.contract, 8)}
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right font-mono">
                        {isError ? (
                          <span className="text-red-400">Error</span>
                        ) : (
                          <span className={isZero ? 'text-gray-500' : 'text-white'}>
                            {formatAmount(row.balance, row.decimals)}
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right font-mono text-xs text-gray-500">
                        {isError ? '—' : row.balance}
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
