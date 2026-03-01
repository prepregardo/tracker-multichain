const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

async function etherscanFetch(params: URLSearchParams, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${ETHERSCAN_BASE}?${params}`)
    const data = await res.json()

    if (data.status === '1') return data

    const msg = (data.message || '').toLowerCase()
    const resultMsg = (typeof data.result === 'string' ? data.result : '').toLowerCase()

    const isRateLimit = msg.includes('rate limit') || resultMsg.includes('rate limit')
      || msg.includes('max calls') || resultMsg.includes('max rate')

    if (isRateLimit && attempt < retries) {
      const delay = 1000 * (attempt + 1) // 1s, 2s, 3s
      await sleep(delay)
      continue
    }

    // Not a rate limit or retries exhausted — throw with Etherscan's message
    const errorDetail = typeof data.result === 'string' ? data.result : data.message
    if (isRateLimit) {
      throw new Error(`Rate limit: ${errorDetail}`)
    }

    // "No transactions found" is not an error
    if (msg === 'no transactions found' || resultMsg === 'no transactions found'
      || msg.includes('no transactions') || data.message === 'No transactions found') {
      return { status: '1', result: [] }
    }

    throw new Error(`Etherscan: ${errorDetail || 'Unknown error'}`)
  }
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

  const data = await etherscanFetch(params)
  return (data.result || []) as EtherscanTx[]
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

  const data = await etherscanFetch(params)
  return data.result
}
