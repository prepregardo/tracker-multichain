const TRONGRID_BASE = 'https://api.trongrid.io'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

async function trongridFetch(url: string, apiKey: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { 'TRON-PRO-API-KEY': apiKey },
    })

    if (res.status === 429 && attempt < retries) {
      await sleep(1000 * (attempt + 1))
      continue
    }

    if (!res.ok) {
      if (res.status === 429) throw new Error('TronGrid: Rate limit exceeded')
      throw new Error(`TronGrid: HTTP ${res.status}`)
    }

    return await res.json()
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

  const data = await trongridFetch(`${endpoint}?${params}`, apiKey)
  return (data.data || []) as TronTx[]
}

export async function getTRC20Balance(
  walletAddress: string,
  contractAddress?: string
): Promise<string> {
  const apiKey = process.env.TRONGRID_API_KEY
  if (!apiKey) throw new Error('TRONGRID_API_KEY not configured')

  const data = await trongridFetch(
    `${TRONGRID_BASE}/v1/accounts/${walletAddress}`,
    apiKey
  )

  if (contractAddress) {
    const trc20 = data.data?.[0]?.trc20 || []
    for (const tokenObj of trc20) {
      if (tokenObj[contractAddress]) {
        return tokenObj[contractAddress]
      }
    }
    return '0'
  }

  return String(data.data?.[0]?.balance || '0')
}
