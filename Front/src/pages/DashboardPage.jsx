/**
 * DashboardPage — Panel ejecutivo.
 * Métricas 100% reales conectadas a PostgreSQL vía GET /api/dashboard/resumen.
 */
import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Package, AlertTriangle, ShoppingBag } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts'
import { dashboardApi } from '../services/api.js'

function fmtCur(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function KpiCard({ label, value, sub, accentColor, icon: Icon }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '18px 20px',
      border: '1px solid #e7e5e4', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </p>
        {Icon && <Icon size={16} style={{ color: accentColor || '#a8a29e' }} />}
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: accentColor || '#1c1917' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: '#a8a29e' }}>{sub}</p>}
    </div>
  )
}

function SectionCard({ title, badge, children, style }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '1px solid #e7e5e4', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      padding: 20, ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    dashboardApi.resumen()
      .then((data) => {
        if (!cancelado) setDatos(data)
      })
      .catch((err) => {
        console.error('Error al cargar dashboard:', err)
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => { cancelado = true }
  }, [])

  const kpis = useMemo(() => datos?.kpis || {}, [datos])
  const ventasSemana = datos?.ventas_ultimos_7_dias || []
  const topProductos = datos?.top_productos || []
  const eventos = datos?.eventos_recientes || []

  const stockPie = useMemo(() => {
    return [
      { name: 'Suficiente', value: kpis.insumos_stock_ok || 0, color: '#10B981' },
      { name: 'Stock bajo', value: kpis.insumos_stock_bajo || 0, color: '#F59E0B' },
      { name: 'Agotado', value: kpis.insumos_agotados || 0, color: '#EF4444' },
    ]
  }, [kpis])

  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#1c1917' }}>
          Panel ejecutivo
        </h2>
        <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
          Vista general del negocio en tiempo real — {fechaHoy}
        </p>
      </div>

      {/* KPIs */}
      {cargando ? (
        <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando métricas en vivo…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
          <KpiCard
            label="Ventas últimos 7 días"
            value={fmtCur(kpis.total_ventas_semana)}
            sub={`${kpis.transacciones_semana || 0} tickets registrados`}
            accentColor="#6B3F1C"
            icon={TrendingUp}
          />
          <KpiCard
            label="Valor del inventario"
            value={fmtCur(kpis.valor_inventario)}
            sub={`${kpis.total_insumos || 0} insumos registrados`}
            icon={Package}
          />
          <KpiCard
            label="Productos activos"
            value={String(kpis.productos_activos || 0)}
            sub={`de ${kpis.total_productos || 0} en catálogo`}
            accentColor="#059669"
            icon={ShoppingBag}
          />
          <KpiCard
            label="Insumos con alerta"
            value={String((kpis.insumos_agotados || 0) + (kpis.insumos_stock_bajo || 0))}
            sub={`${kpis.insumos_agotados || 0} agotados · ${kpis.insumos_stock_bajo || 0} bajos`}
            accentColor={(kpis.insumos_agotados || 0) > 0 ? '#ef4444' : '#059669'}
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* Gráficas principales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 16 }}>

          {/* Ventas semana - REAL */}
          <SectionCard title="Ventas — últimos 7 días">
            {cargando ? (
              <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando gráfica…</p>
            ) : ventasSemana.length === 0 ? (
              <p style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center', padding: '30px 0' }}>No hay ventas registradas en los últimos 7 días.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ventasSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#8B6A54' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B6A54' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => [fmtCur(v), 'Ventas']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #F0EAE0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="ventas" stroke="#E8A44A" strokeWidth={2.5}
                    dot={{ fill: '#E8A44A', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Estado inventario - REAL */}
          <SectionCard title="Estado del inventario">
            {cargando ? (
              <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando inventario…</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={stockPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={3} dataKey="value">
                      {stockPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'insumos']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #F0EAE0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {stockPie.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                        <span style={{ color: '#57534e' }}>{d.name}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1c1917' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 16 }}>

          {/* Top productos - REAL */}
          <SectionCard title="Top productos — unidades vendidas">
            {cargando ? (
              <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando top…</p>
            ) : topProductos.length === 0 || topProductos.every(p => p.unidades === 0) ? (
              <p style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center', padding: '30px 0' }}>
                Aún no hay ventas registradas para generar el ranking.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topProductos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8B6A54' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#8B6A54' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(v) => [v, 'unidades']} contentStyle={{ borderRadius: 8, border: '1px solid #F0EAE0', fontSize: 12 }} />
                  <Bar dataKey="unidades" fill="#6B3F1C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Eventos recientes / próximos - REAL */}
          <SectionCard title="Eventos y Festivales">
            {cargando ? (
              <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando eventos…</p>
            ) : eventos.length === 0 ? (
              <p style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center', padding: '30px 0' }}>
                No hay eventos registrados. Regístralos en el módulo Eventos.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {eventos.map((ev) => (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                    paddingBottom: 10, borderBottom: '1px solid #f5f5f4',
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1917' }}>{ev.nombre}</p>
                      <p style={{ fontSize: 11, color: '#a8a29e' }}>{ev.fecha} · {ev.ubicacion}</p>
                    </div>
                    {ev.ventas > 0
                      ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#059669', whiteSpace: 'nowrap' }}>{fmtCur(ev.ventas)}</span>
                      : <span style={{ fontSize: 11, color: '#a8a29e', background: '#f5f5f4', padding: '2px 8px', borderRadius: 4 }}>{ev.estado || 'Programado'}</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
