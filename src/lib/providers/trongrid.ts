const TRONGRID_BASE = 'https://api.trongrid.io'

interface TronTx {
  transaction_id: string
  from: string
  to: string
  type: string
  value: string
  block_timestamp: number
  block: number
  token_info?: {
    symbol: string
    decimals: number
    address: string
  }
}

export async function getTRC20Transactions(
  walletAddress: string,
  contractAddress?: string,
  limit = 50
): Promise<TronTx[]> {
  const apiKey = process.env.TRONGRID_API_KEY
  if (!apiKey) throw new Error('TRONGRID_API_KEY not configured')

  const endpoint = contractAddress
    ? `${TRONGRID_BASE}/v1/accounts/${walletAddress}/transactions/trc20`
    : `${TRONGRID_BASE}/v1/accounts/${walletAddress}/transactions`

  const params = new URLSearchParams({
    limit: String(limit),
    order_by: 'block_timestamp,desc',
  })

  if (contractAddress) {
    params.set('contract_address', contractAddress)
  }

  const res = await fetch(`${endpoint}?${params}`, {
    headers: { 'TRON-PRO-API-KEY': apiKey },
  })

  const data = await res.json()
  return (data.data || []) as TronTx[]
}

export async function getTRC20Balance(
  walletAddress: string,
  contractAddress?: string
): Promise<string> {
  const apiKey = process.env.TRONGRID_API_KEY
  if (!apiKey) throw new Error('TRONGRID_API_KEY not configured')

  if (contractAddress) {
    const res = await fetch(
      `${TRONGRID_BASE}/v1/accounts/${walletAddress}`,
      { headers: { 'TRON-PRO-API-KEY': apiKey } }
    )
    const data = await res.json()
    const trc20 = data.data?.[0]?.trc20 || []
    for (const tokenObj of trc20) {
      if (tokenObj[contractAddress]) {
        return tokenObj[contractAddress]
      }
    }
    return '0'
  }

  const res = await fetch(
    `${TRONGRID_BASE}/v1/accounts/${walletAddress}`,
    { headers: { 'TRON-PRO-API-KEY': apiKey } }
  )
  const data = await res.json()
  return String(data.data?.[0]?.balance || '0')
}
