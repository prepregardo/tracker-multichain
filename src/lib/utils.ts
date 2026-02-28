import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function shortenAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`
}

export function formatAmount(amount: string, decimals = 18): string {
  const num = Number(amount) / Math.pow(10, decimals)
  if (num === 0) return '0'
  if (num < 0.001) return '< 0.001'
  return num.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

export function networkExplorerUrl(network: string, hash: string): string {
  if (network === 'ERC20') {
    return `https://etherscan.io/tx/${hash}`
  }
  return `https://tronscan.org/#/transaction/${hash}`
}

export function addressExplorerUrl(network: string, address: string): string {
  if (network === 'ERC20') {
    return `https://etherscan.io/address/${address}`
  }
  return `https://tronscan.org/#/address/${address}`
}
