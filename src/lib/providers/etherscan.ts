const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api'

interface EtherscanTx {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  blockNumber: string
  gasUsed: string
  gasPrice: string
  isError: string
  tokenSymbol?: string
  tokenDecimal?: string
  contractAddress?: string
}

export async function getERC20Transactions(
  walletAddress: string,
  contractAddress?: string,
  page = 1,
  offset = 100
): Promise<EtherscanTx[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) throw new Error('ETHERSCAN_API_KEY not configured')

  const params = new URLSearchParams({
    chainid: '1',
    module: 'account',
    action: 'tokentx',
    address: walletAddress,
    startblock: '0',
    endblock: '99999999',
    page: String(page),
    offset: String(offset),
    sort: 'desc',
    apikey: apiKey,
  })

  if (contractAddress) {
    params.set('contractaddress', contractAddress)
  }

  const res = await fetch(`${ETHERSCAN_BASE}?${params}`)
  const data = await res.json()

  if (data.status !== '1') {
    // Log the error for debugging but don't throw
    console.error('Etherscan API error:', data.message, data.result)
    return []
  }

  return data.result as EtherscanTx[]
}

export async function getERC20Balance(
  walletAddress: string,
  contractAddress?: string
): Promise<string> {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) throw new Error('ETHERSCAN_API_KEY not configured')

  const params = new URLSearchParams({
    chainid: '1',
    module: 'account',
    action: contractAddress ? 'tokenbalance' : 'balance',
    address: walletAddress,
    tag: 'latest',
    apikey: apiKey,
  })

  if (contractAddress) {
    params.set('contractaddress', contractAddress)
  }

  const res = await fetch(`${ETHERSCAN_BASE}?${params}`)
  const data = await res.json()

  if (data.status !== '1') return '0'

  return data.result
}
