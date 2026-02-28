'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@tracker.local')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await signIn('credentials', { email, callbackUrl: '/dashboard' })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">TC</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">Tracker Multichain</h1>
          <p className="mt-2 text-gray-400">
            Multi-chain asset tracking for your team
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tracker.local"
              required
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-gray-600">
          Default admin: admin@tracker.local
        </p>
      </div>
    </div>
  )
}
