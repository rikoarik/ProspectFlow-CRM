import type { Audit, FollowUp, Prospect, ProspectStatus, Sales } from '@/lib/types'
import { pct } from '@/lib/utils'

export function dashboardStats(prospects: Prospect[], followUps: FollowUp[], audits: Audit[]) {
  const count = (status: ProspectStatus) => prospects.filter((p) => p.status === status).length
  const contacted = prospects.filter((p) =>
    ['Contacted', 'Replied', 'Interested', 'Need Follow Up', 'Proposal Sent', 'Deal', 'Rejected'].includes(p.status),
  ).length
  const replied = prospects.filter((p) =>
    ['Replied', 'Interested', 'Need Follow Up', 'Proposal Sent', 'Deal', 'Rejected'].includes(p.status),
  ).length
  const deals = count('Deal')
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const followUpToday = followUps.filter((f) => f.follow_up_date.slice(0, 10) === todayKey && f.status !== 'Done').length
  const overdue = followUps.filter((f) => new Date(f.follow_up_date) < today && f.status !== 'Done').length

  return {
    total: prospects.length,
    new: count('New'),
    contacted,
    replied,
    interested: count('Interested'),
    followUp: count('Need Follow Up'),
    deal: deals,
    rejected: count('Rejected'),
    highPriority: prospects.filter((p) => p.priority === 'A').length,
    followUpToday,
    overdueFollowUps: overdue,
    auditsSent: audits.filter((a) => a.audit_status === 'Sent' || a.audit_status === 'Approved').length,
    contactedToReplied: pct(replied, contacted),
    repliedToDeal: pct(deals, replied),
  }
}

export function prospectsPerSales(prospects: Prospect[], sales: Sales[]) {
  return sales
    .filter((s) => s.role === 'Sales')
    .map((s) => ({
      name: s.full_name.split(' ')[0],
      total: prospects.filter((p) => p.assigned_to === s.id).length,
      deal: prospects.filter((p) => p.assigned_to === s.id && p.status === 'Deal').length,
      replied: prospects.filter((p) => p.assigned_to === s.id && p.status === 'Replied').length,
    }))
}

export function statusDistribution(prospects: Prospect[]) {
  const groups = new Map<string, number>()
  prospects.forEach((p) => groups.set(p.status, (groups.get(p.status) ?? 0) + 1))
  return Array.from(groups.entries()).map(([name, value]) => ({ name, value }))
}

export function priorityDistribution(prospects: Prospect[]) {
  return ['A', 'B', 'C'].map((priority) => ({
    name: `Priority ${priority}`,
    value: prospects.filter((p) => p.priority === priority).length,
  }))
}

export function followUpBuckets(followUps: FollowUp[]) {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endToday = new Date(startToday.getTime() + 24 * 3600 * 1000)
  const endWeek = new Date(startToday.getTime() + 7 * 24 * 3600 * 1000)
  return {
    overdue: followUps.filter((f) => new Date(f.follow_up_date) < startToday && f.status !== 'Done'),
    today: followUps.filter((f) => {
      const d = new Date(f.follow_up_date)
      return d >= startToday && d < endToday && f.status !== 'Done'
    }),
    week: followUps.filter((f) => {
      const d = new Date(f.follow_up_date)
      return d >= endToday && d < endWeek && f.status !== 'Done'
    }),
    done: followUps.filter((f) => f.status === 'Done'),
  }
}

export function prospectByIdMap(prospects: Prospect[]) {
  return new Map(prospects.map((p) => [p.id, p]))
}

export function salesByIdMap(sales: Sales[]) {
  return new Map(sales.map((s) => [s.id, s]))
}