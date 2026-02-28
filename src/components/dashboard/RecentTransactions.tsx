'use client'

import { shortenAddress, networkExplorerUrl, formatAmount } from '@/lib/utils'
import type { TransactionData } from '@/types'

interface RecentTransactionsProps {
  transactions: TransactionData[]
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Transactions</h3>
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No transactions yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="table-header">Network</th>
                <th className="table-header">Hash</th>
                <th className="table-header">Direction</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transactions.map((tx) => (
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
                      className="text-brand-400 hover:text-brand-300"
                    >
                      {shortenAddress(tx.hash, 8)}
                    </a>
                  </td>
                  <td className="table-cell">
                    <span className={tx.direction === 'IN' ? 'badge-in' : 'badge-out'}>
                      {tx.direction}
                    </span>
                  </td>
                  <td className="table-cell font-mono">{formatAmount(tx.amount)}</td>
                  <td className="table-cell text-gray-500">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
