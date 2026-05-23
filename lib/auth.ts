import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Usuário ou Email', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const input = credentials.email.trim()
        // Try email first, then username (name field)
        let user = await prisma.user.findUnique({ where: { email: input } })
        if (!user) {
          user = await prisma.user.findFirst({ where: { name: input } })
        }

        if (!user || !user.active) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )
        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tutorDogId: user.tutorDogId ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role: string; id: string; tutorDogId?: string | null }
        token.role = u.role
        token.id = u.id
        token.tutorDogId = u.tutorDogId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { role: string; id: string; tutorDogId?: string | null }
        u.role = token.role as string
        u.id = token.id as string
        u.tutorDogId = (token.tutorDogId as string | null) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
