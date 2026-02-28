import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Sign in',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@tracker.local' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const email = credentials.email

        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@tracker.local'
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0],
              role: email === adminEmail ? 'ADMIN' : 'VIEWER',
            },
          })
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 14 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
