export const chartColors = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  slate: '#64748b',
}

export const statusColor: Record<string, string> = {
  New: 'bg-slate-100 text-slate-700 border-slate-200',
  'Need Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ready to Contact': 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Replied: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Interested: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Need Follow Up': 'bg-orange-50 text-orange-700 border-orange-200',
  'Proposal Sent': 'bg-violet-50 text-violet-700 border-violet-200',
  Deal: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  'No Response': 'bg-gray-50 text-gray-700 border-gray-200',
  Archived: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export const priorityColor: Record<string, string> = {
  A: 'bg-rose-50 text-rose-700 border-rose-200',
  B: 'bg-amber-50 text-amber-700 border-amber-200',
  C: 'bg-slate-50 text-slate-700 border-slate-200',
}

export const navGradient = 'from-emerald-500 via-cyan-500 to-blue-500'