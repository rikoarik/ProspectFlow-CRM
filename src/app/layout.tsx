import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { getSession } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })

export const metadata: Metadata = {
  title: 'ProspectFlow CRM',
  description: 'Sales CRM untuk tracking prospek, outreach, follow-up, audit website, dan deal pipeline.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const currentUser = session?.profile
    ? {
        name: session.profile.full_name,
        email: session.profile.email,
        role: session.profile.role,
      }
    : null

  return (
    <html lang="id" className={`${inter.variable} ${space.variable}`}>
      <body>
        <AppShell currentUser={currentUser}>{children}</AppShell>
      </body>
    </html>
  )
}