'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { shortenAddress } from '@/lib/utils'

interface BalanceRecord {
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

interface Token {
    contract: string
    symbol: string
    decimals: number
    network: string
}

function formatBalance(raw: string, decimals: number): string {
    if (!raw || raw === '0') return '0'
    const str = raw.padStart(decimals + 1, '0')
    const intPart = str.slice(0, str.length - decimals) || '0'
    const fracPart = str.slice(str.length - decimals).replace(/0+$/, '')
    return fracPart ? `${intPart}.${fracPart}` : intPart
}

export default function ReconciliationView({
    records,
    wallets,
    tokens,
}: {
    records: BalanceRecord[]
    wallets: Wallet[]
    tokens: Token[]
}) {
    const router = useRouter()
    const [running, setRunning] = useState(false)

  async function handleCheck() {
        setRunning(true)
        try {
                const res = await fetch('/api/reconciliation', { method: 'POST' })
                if (res.ok) router.refresh()
                else {
                          const data = await res.json()
                          alert(data.error || 'Failed to check balances')
                }
        } finally {
                setRunning(false)
        }
  }

  function getDecimals(record: BalanceRecord): number {
        if (!record.token || record.token === 'Native') {
                return 18
        }
        const tok = tokens.find(
                (t) => t.symbol === record.token && t.network === record.network
              )
        return tok?.decimals ?? 18
  }

  return (
        <>
              <div className="flex items-center gap-4">
                      <button onClick={handleCheck} disabled={running} className="btn-primary">
                        {running ? 'Checking...' : 'Check Balances'}
                      </button>button>
                {records.length > 0 && (
                    <span className="text-sm text-gray-500">
                                Last checked: {new Date(records[0]?.createdAt).toLocaleString()}
                    </span>span>
                      )}
              </div>div>
        
          {records.length === 0 ? (
                  <div className="card text-center py-12">
                            <p className="text-gray-500">
                                        No balance data yet. Add wallets and click &quot;Check Balances&quot;.
                            </p>p>
                  </div>div>
                ) : (
                  <div className="card overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                        <table className="w-full">
                                                      <thead>
                                                                      <tr className="border-b border-gray-800">
                                                                                        <th className="table-header">Network</th>th>
                                                                                        <th className="table-header">Wallet</th>th>
                                                                                        <th className="table-header">Token</th>th>
                                                                                        <th className="table-header">Balance</th>th>
                                                                                        <th className="table-header">Updated</th>th>
                                                                      </tr>tr>
                                                      </thead>thead>
                                                      <tbody className="divide-y divide-gray-800">
                                                        {records.map((record) => {
                                      const walletInfo = wallets.find(
                                                            (w) => w.address.toLowerCase() === record.wallet.toLowerCase()
                                                                                )
                                                          const decimals = getDecimals(record)
                                                                              const displayBalance = formatBalance(record.actualBalance, decimals)
                                                                                                  const tokenLabel = record.token || 'Native'
                                                                                                    
                                                                                                                      return (
                                                                                                                                            <tr key={record.id} className="hover:bg-gray-800/50">
                                                                                                                                                                  <td className="table-cell">
                                                                                                                                                                                          <span className={record.network === 'ERC20' ? 'badge-erc20' : 'badge-trc20'}>
                                                                                                                                                                                                                    {record.network}
                                                                                                                                                                                                                  </span>span>
                                                                                                                                                                    </td>td>
                                                                                                                                                                  <td className="table-cell font-mono">
                                                                                                                                                                    {walletInfo?.label || shortenAddress(record.wallet)}
                                                                                                                                                                    </td>td>
                                                                                                                                                                  <td className="table-cell">{tokenLabel}</td>td>
                                                                                                                                                                  <td className="table-cell font-mono">
                                                                                                                                                                    {displayBalance}
                                                                                                                                                                    </td>td>
                                                                                                                                                                  <td className="table-cell text-gray-500">
                                                                                                                                                                    {new Date(record.createdAt).toLocaleString()}
                                                                                                                                                                    </td>td>
                                                                                                                                              </tr>tr>
                                                                                                                                          )
                                                        })}
                                                      </tbody>tbody>
                                        </table>table>
                            </div>div>
                  </div>div>
              )}
        </>>
      )
}</>
