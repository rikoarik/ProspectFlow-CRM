'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { chartColors } from '@/lib/design'

const palette = [
  chartColors.emerald,
  chartColors.blue,
  chartColors.amber,
  chartColors.violet,
  chartColors.rose,
  chartColors.slate,
]

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
      {label ? <div className="mb-1 font-semibold text-slate-950">{label}</div> : null}
      {payload.map((item: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          <span>{item.name}: {item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function StatusPie({ data }: { data: { name: string; value: number }[] }) {
  const visible = data.length > 6
    ? [...data.slice(0, 5), { name: 'Other', value: data.slice(5).reduce((sum, item) => sum + item.value, 0) }]
    : data
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status prospek</CardTitle>
        <CardDescription>Distribusi pipeline aktif. Identitas status tetap tampil lewat legenda.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" data={visible} innerRadius={72} outerRadius={108} paddingAngle={3}>
              {visible.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
            <Tooltip content={<TooltipBox />} />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SalesBar({ data }: { data: { name: string; total: number; replied: number; deal: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prospek per sales</CardTitle>
        <CardDescription>Jumlah prospek, reply, dan deal per sales assigned.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<TooltipBox />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="total" name="Total" fill={chartColors.blue} radius={[6, 6, 0, 0]} />
            <Bar dataKey="replied" name="Replied" fill={chartColors.violet} radius={[6, 6, 0, 0]} />
            <Bar dataKey="deal" name="Deal" fill={chartColors.emerald} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function PriorityBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Priority mix</CardTitle>
        <CardDescription>Fokuskan outreach harian dari Priority A.</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<TooltipBox />} />
            <Bar dataKey="value" name="Prospek" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={[chartColors.rose, chartColors.amber, chartColors.slate][i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}