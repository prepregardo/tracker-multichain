'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { shortenAddress, formatAmount, addressExplorerUrl } from '@/lib/utils'

interface BalanceRow {
  wallet: string
  walletLabel: string | null
  network: string
  token: string
  contract: string | null
  decimals: number
  balance: string
}

export default function BalancesView() {
  const [walletCount, setWalletCount] = useState<number | null>(null)
  const [tokenCount, setTokenCount] = useState<number | null>(null)
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [filterNetwork, setFilterNetwork] = useState('')
  const [filterToken, setFilterToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCounts() {
      try {
        const [walletsRes, tokensRes] = await Promise.all([
          fetch('/api/wallets'),
          fetch('/api/tokens'),
        ])
        if (walletsRes.ok) {
          const w = await walletsRes.json()
          setWalletCount(Array.isArray(w) ? w.length : 0)
        }
        if (tokensRes.ok) {
          const t = await tokensRes.json()
          setTokenCount(Array.isArray(t) ? t.length : 0)
        }
      } catch {
        // ignore
      } finally {
        setInitLoading(false)
      }
    }
    loadCounts()
  }, [])

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    setBalances([])
    setProgress({ current: 0, total: 0 })

    try {
      let page = 0
      let allResults: BalanceRow[] = []

      while (true) {
        const res = await fetch(`/api/balances?page=${page}`)
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error || `Server error: ${res.status}`)
          break
        }

        const data = await res.json()
        allResults = [...allResults, ...data.results]
        setBalances(allResults)
        setProgress({ current: page + 1, total: data.totalPages })

        if (data.done) break
        page++
      }

      setLoaded(true)
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const filtered = balances.filter((b) => {
    if (filterNetwork && b.network !== filterNetwork) return false
    if (filterToken && b.token !== filterToken) return false
    return true
  })

  const networks = [...new Set(balances.map((b) => b.network))]
  const tokenSymbols = [...new Set(balances.map((b) => b.token))]

  const nonZero = filtered.filter((b) => b.balance !== '0' && b.balance !== 'error')
  const errors = filtered.filter((b) => b.balance === 'error')

  if (initLoading) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (walletCount === 0) {
    return (
      <div className="card text-center py-16 space-y-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Wallets</p>
          <p className="text-2xl font-bold text-white">{walletCount ?? '—'}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Tokens</p>
          <p className="text-2xl font-bold text-white">{tokenCount ?? '—'}</p>
          {tokenCount === 0 && (
            <Link href="/tokens" className="text-xs text-brand-400 hover:underline">
              Add tokens
            </Link>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Non-zero Balances</p>
          <p className="text-2xl font-bold text-white">{loaded || balances.length > 0 ? nonZero.length : '—'}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={fetchBalances} disabled={loading} className="btn-primary">
          {loading ? 'Loading...' : loaded ? 'Refresh Balances' : 'Fetch Balances'}
        </button>
        {loading && progress.total > 0 && (
          <span className="text-sm text-gray-400">
            Page {progress.current}/{progress.total} ({balances.length} results)
          </span>
        )}
        {!loading && loaded && errors.length > 0 && (
          <span className="text-sm text-red-400">
            {errors.length} error(s)
          </span>
        )}
      </div>

      {loading && progress.total > 0 && (
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}

      {error && (
        <div className="card border border-red-500/30 bg-red-500/5">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

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

      {!loaded && !loading && !error ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            Click &quot;Fetch Balances&quot; to load real-time balances from blockchain.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            {walletCount} wallet(s) &times; {tokenCount ?? 0} token(s)
          </p>
        </div>
      ) : (filtered.length === 0 && loaded) ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No balances found matching filters.</p>
        </div>
      ) : (balances.length > 0) ? (
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
      ) : null}
    </>
  )
}
