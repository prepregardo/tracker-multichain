'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface VolumeChartProps {
  data: { network: string; volume: number }[]
}

export default function VolumeChart({ data }: VolumeChartProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Volume by Network</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="network" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#e5e7eb',
              }}
            />
            <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
