'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TxChartProps {
  data: { date: string; count: number }[]
}

export default function TxChart({ data }: TxChartProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Transactions Over Time</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#e5e7eb',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.1}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
