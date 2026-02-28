import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (!existingUser) {
        const adminEmail = process.env.ADMIN_EMAIL
        const role = user.email === adminEmail ? 'ADMIN' : 'VIEWER'
        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            role,
          },
        })
      }

      return true
    },
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        session.user.id = user.id
        session.user.role = dbUser?.role || 'VIEWER'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'database',
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
}
