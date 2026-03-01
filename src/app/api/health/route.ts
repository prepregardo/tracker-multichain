import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    db: !!process.env.DATABASE_URL,
    etherscan: !!process.env.ETHERSCAN_API_KEY,
    trongrid: !!process.env.TRONGRID_API_KEY,
  })
}
