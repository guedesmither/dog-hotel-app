'use client'

import dynamic from 'next/dynamic'

export const DynamicAreaChart = dynamic(
  () => import('recharts').then(m => ({ default: m.AreaChart })),
  { ssr: false }
)
export const DynamicBarChart = dynamic(
  () => import('recharts').then(m => ({ default: m.BarChart })),
  { ssr: false }
)
export const DynamicLineChart = dynamic(
  () => import('recharts').then(m => ({ default: m.LineChart })),
  { ssr: false }
)
export const DynamicResponsiveContainer = dynamic(
  () => import('recharts').then(m => ({ default: m.ResponsiveContainer })),
  { ssr: false }
)

export {
  Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts'
