import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { fetchDashboardStats, fetchSalesByDay } from '@/services/admin/adminDashboard'
import { fetchLowStockProducts } from '@/services/admin/adminProducts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrencyBRL } from '@/lib/utils'
import { paths } from '@/routes/paths'

function formatDayLabel(isoDate: string) {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

export function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: fetchDashboardStats,
  })
  const salesQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'sales-by-day'],
    queryFn: () => fetchSalesByDay(14),
  })
  const lowStockQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'low-stock'],
    queryFn: () => fetchLowStockProducts(10),
  })

  const stats = statsQuery.data
  const chartData = (salesQuery.data ?? []).map((point) => ({
    label: formatDayLabel(point.date),
    totalCents: point.totalCents,
  }))

  const statCards = [
    { label: 'Vendas hoje', value: stats ? formatCurrencyBRL(stats.salesTodayCents) : null },
    { label: 'Pedidos hoje', value: stats ? String(stats.ordersToday) : null },
    { label: 'Vendas no mês', value: stats ? formatCurrencyBRL(stats.salesMonthCents) : null },
    { label: 'Pedidos no mês', value: stats ? String(stats.ordersMonth) : null },
    { label: 'Ticket médio', value: stats ? formatCurrencyBRL(stats.averageTicketCents) : null },
    { label: 'Pedidos pendentes', value: stats ? String(stats.pendingOrders) : null },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das vendas e do estoque.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {card.value === null ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-xl font-semibold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendas nos últimos 14 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {salesQuery.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Sem vendas registradas no período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value: number) => formatCurrencyBRL(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrencyBRL(value)}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCents"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Estoque baixo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {lowStockQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (lowStockQuery.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum produto com estoque baixo.
              </p>
            ) : (
              (lowStockQuery.data ?? []).map((product) => (
                <Link
                  key={product.id}
                  to={paths.adminProduct(product.id)}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-destructive">
                    {product.available} / {product.minStockAlert}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
