'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  FileSearch,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ToastProvider } from '@/components/ui/toast'
import { UserMenu } from '@/components/auth/user-menu'
import { Brand } from '@/components/brand'

interface AppShellUser {
  name: string
  email: string
  role: 'Admin' | 'Sales'
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/prospects', label: 'Prospects', icon: Target },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/follow-up', label: 'Follow Up', icon: CalendarClock },
  { href: '/audit', label: 'Audit', icon: FileSearch },
  { href: '/mockups', label: 'AI Mockups', icon: Sparkles },
  { href: '/templates', label: 'Message Templates', icon: MessageSquareText },
  { href: '/sales-team', label: 'Sales Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const COLLAPSED_STORAGE_KEY = 'prospectflow.sidebar.collapsed'

function NavLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-1 px-3">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon
        const className = cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-950',
          active && 'bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white',
          collapsed && 'justify-center px-0',
        )
        if (collapsed) {
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={onNavigate}
              aria-label={item.label}
              title={item.label}
              className={className}
            >
              <Icon className="h-4 w-4" />
            </Link>
          )
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            className={className}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function CollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const Icon = collapsed ? ChevronsRight : ChevronsLeft
  const label = collapsed ? 'Expand sidebar' : 'Ciutkan sidebar'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={collapsed}
      title={label}
      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>Ciutkan menu</span>}
    </button>
  )
}

export function AppShell({
  children,
  currentUser,
}: {
  children: React.ReactNode
  currentUser: AppShellUser | null
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (stored === '1') setCollapsed(true)
    } catch {
      // localStorage unavailable; keep default
    }
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [collapsed, hydrated])

  if (pathname === '/login') {
    return <ToastProvider>{children}</ToastProvider>
  }

  const sidebarWidthClass = collapsed ? 'lg:w-16' : 'lg:w-72'
  const mainPadClass = collapsed ? 'lg:pl-16' : 'lg:pl-72'

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_34rem),linear-gradient(180deg,#f8fafc,#eef2f7)]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200/70 bg-white/85 backdrop-blur-xl transition-[width] duration-200 ease-out lg:block',
            sidebarWidthClass,
          )}
        >
          <div className="flex h-full flex-col">
            <div className={cn('p-6', collapsed && 'flex justify-center px-2 py-6')}>
              {collapsed ? <BrandMarkCompact /> : <Brand />}
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} collapsed={collapsed} />
            </div>
            <div className="p-4">
              {collapsed ? (
                <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
              ) : (
                <>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="text-sm font-semibold text-emerald-950">War-room mode</div>
                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                      Kelola prospek, audit, follow-up, dan mockup tim sales dari satu workspace.
                    </p>
                  </div>
                  <div className="mt-3">
                    <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <Brand />
                <button aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className={cn('transition-[padding] duration-200 ease-out', mainPadClass)}>
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-1 items-center gap-3">
                <button aria-label="Open navigation" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-5 w-5" />
                </button>
                <div className="relative max-w-xl flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input aria-label="Global search" className="pl-9" placeholder="Search company, city, industry..." />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button aria-label="Notifications" disabled title="Notifications belum masuk MVP" className="rounded-full border border-slate-200 bg-white p-2 text-slate-400">
                  <Bell className="h-4 w-4" />
                </button>
                {currentUser ? (
                  <UserMenu name={currentUser.name} email={currentUser.email} role={currentUser.role} />
                ) : (
                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-semibold text-slate-950">Belum login</div>
                    <div className="text-xs text-slate-500">Masuk untuk melihat pipeline tim.</div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  )
}

// Inline compact brand mark used when the sidebar is collapsed, so we don't
// need to extend the Brand component with another variant.
function BrandMarkCompact() {
  return (
    <div
      aria-label="ProspectFlow CRM"
      title="ProspectFlow CRM"
      className="relative h-11 w-11 overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/15"
    >
      <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-emerald-400" />
      <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-1">
        <span className="h-5 rounded bg-emerald-500" />
        <span className="h-7 rounded bg-cyan-400" />
        <span className="h-4 rounded bg-blue-400" />
      </div>
    </div>
  )
}