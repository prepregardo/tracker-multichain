'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm px-6">
      <div />

      <div className="flex items-center gap-4">
        {status === 'loading' && (
          <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse" />
        )}

        {status === 'unauthenticated' && (
          <button
            onClick={() => signIn()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Sign in
          </button>
        )}

        {status === 'authenticated' && session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {session.user.role}
            </span>
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session.user.name?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-300">{session.user.name}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
