const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const ETHERSCAN_BASE = 'https://api.etherscan.io/api'

export interface EtherscanTx {
    hash: string
    blockNumber: string
    timeStamp: string
    from: string
    to: string
    value: string
    contractAddress: string
    tokenName: string
    tokenSymbol: string
    tokenDecimal: string
    gas: string
    gasUsed: string
    gasPrice: string
}

export async function fetchERC20Transactions(
    address: string,
    startBlock = 0,
    page = 1,
    offset = 100
  ): Promise<EtherscanTx[]> {
    const url = new URL(ETHERSCAN_BASE)
    url.searchParams.set('module', 'account')
    url.searchParams.set('action', 'tokentx')
    url.searchParams.set('address', address)
    url.searchParams.set('startblock', String(startBlock))
    url.searchParams.set('endblock', '99999999')
    url.searchParams.set('page', String(page))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('sort', 'desc')
    url.searchParams.set('apikey', ETHERSCAN_API_KEY)

  const res = await fetch(url.toString())
    const data = await res.json()

  if (data.status !== '1' || !Array.isArray(data.result)) {
        return []
  }
    return data.result as EtherscanTx[]
}

export function mapEtherscanTx(tx: EtherscanTx, walletAddress: string) {
    const direction = tx.to.toLowerCase() === walletAddress.toLowerCase() ? 'IN' : 'OUT'
    const fee = String(
          (BigInt(tx.gasUsed) * BigInt(tx.gasPrice)) / BigInt(10 ** 18)
        )

  return {
        network: 'ERC20' as const,
        hash: tx.hash,
        wallet: walletAddress,
        token: tx.contractAddress || null,
        direction,
        amount: tx.value,
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
        blockNumber: parseInt(tx.blockNumber, 10),
        fee,
        status: 'confirmed',
  }
}
