export type Network = 'ERC20' | 'TRC20'
export type Role = 'ADMIN' | 'VIEWER'
export type TxDirection = 'IN' | 'OUT'

export interface WalletData {
  id: string
  network: Network
  address: string
  label: string | null
  createdAt: string
}

export interface TokenData {
  id: string
  network: Network
  contract: string
  symbol: string
  decimals: number
}

export interface TransactionData {
  id: string
  network: Network
  hash: string
  wallet: string
  token: string | null
  direction: TxDirection
  amount: string
  timestamp: string
  blockNumber: number
  fee: string | null
  status: string
}

export interface ReconciliationData {
  id: string
  wallet: string
  network: Network
  token: string | null
  expectedBalance: string
  actualBalance: string
  difference: string
  status: string
  createdAt: string
}

export interface DashboardStats {
  totalWallets: number
  totalTokens: number
  totalTransactions: number
  recentTransactions: TransactionData[]
  volumeByNetwork: { network: string; volume: number }[]
  txByDay: { date: string; count: number }[]
}
