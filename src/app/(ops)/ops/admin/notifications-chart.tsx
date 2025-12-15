'use client'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@shared/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

type TrendPoint = { name: string; value: number }

type NotificationsChartProps = {
  data: TrendPoint[]
}

/**
 * Client-only chart for the admin overview to avoid running Recharts on the server.
 */
export function NotificationsChart({ data }: NotificationsChartProps) {
  return (
    <ChartContainer
      config={{ notifications: { label: 'Notifications', color: 'primary' } }}
      className="h-64"
    >
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
        <XAxis dataKey="name" stroke="var(--chart-axis-color)" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} stroke="var(--chart-axis-color)" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-notifications)" radius={[6, 6, 6, 6]} />
      </BarChart>
    </ChartContainer>
  )
}
