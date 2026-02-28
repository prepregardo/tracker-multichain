import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { getERC20Transactions } from '@/lib/providers/etherscan'
import { getTRC20Transactions } from '@/lib/providers/trongrid'

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const wallets = await prisma.wallet.findMany()
    let synced = 0

    for (const wallet of wallets) {
      try {
        if (wallet.network === 'ERC20') {
          const txs = await getERC20Transactions(wallet.address)
          for (const tx of txs) {
            const direction = tx.to.toLowerCase() === wallet.address.toLowerCase() ? 'IN' : 'OUT'
            await prisma.transaction.upsert({
              where: {
                network_hash_wallet: {
                  network: 'ERC20',
                  hash: tx.hash,
                  wallet: wallet.address,
                },
              },
              update: {},
              create: {
                network: 'ERC20',
                hash: tx.hash,
                wallet: wallet.address,
                token: tx.contractAddress || null,
                direction,
                amount: tx.value,
                timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
                blockNumber: parseInt(tx.blockNumber, 10),
                fee: tx.gasUsed && tx.gasPrice
                  ? String(BigInt(tx.gasUsed) * BigInt(tx.gasPrice))
                  : null,
                status: tx.isError === '0' ? 'confirmed' : 'failed',
              },
            })
            synced++
          }
        }

        if (wallet.network === 'TRC20') {
          const txs = await getTRC20Transactions(wallet.address)
          for (const tx of txs) {
            const direction = tx.to.toLowerCase() === wallet.address.toLowerCase() ? 'IN' : 'OUT'
            await prisma.transaction.upsert({
              where: {
                network_hash_wallet: {
                  network: 'TRC20',
                  hash: tx.transaction_id,
                  wallet: wallet.address,
                },
              },
              update: {},
              create: {
                network: 'TRC20',
                hash: tx.transaction_id,
                wallet: wallet.address,
                token: tx.token_info?.address || null,
                direction,
                amount: tx.value,
                timestamp: new Date(tx.block_timestamp),
                blockNumber: tx.block,
                fee: null,
                status: 'confirmed',
              },
            })
            synced++
          }
        }
      } catch (e) {
        console.error(`Failed to sync wallet ${wallet.address}:`, e)
      }
    }

    return NextResponse.json({ ok: true, synced })
  } catch {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
