/**
 * Layout principal con barra lateral fija (Sidebar).
 * Envuelve todas las páginas de la aplicación.
 */
import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  BarChart2,
  ShoppingBag,
  BookOpen,
  ShoppingCart,
  Calendar,
  ChevronRight,
  Bell,
  Search,
  Menu,
  X,
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'insumos',    label: 'Insumos',      icon: Package },
  { id: 'inventario', label: 'Inventario',   icon: BarChart2 },
  { id: 'productos',  label: 'Productos',    icon: ShoppingBag },
  { id: 'recetas',    label: 'Recetas',      icon: BookOpen },
  { id: 'ventas',     label: 'Ventas / POS', icon: ShoppingCart },
  { id: 'eventos',    label: 'Eventos',      icon: Calendar },
]

export default function Layout({ seccion, onNavegar, alertasCount = 0, children }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const modulo = NAV.find((n) => n.id === seccion)?.label ?? ''

  return (
    <div style={{ display: 'flex', height: '100svh', overflow: 'hidden', background: '#FAF7F2', fontFamily: "var(--font-body)" }}>

      {/* ── Overlay móvil ── */}
      {menuAbierto && (
        <div
          onClick={() => setMenuAbierto(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 224,
          flexShrink: 0,
          background: '#3D2209',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.25s',
          // En móvil se oculta con transform
          transform: menuAbierto ? 'translateX(0)' : undefined,
        }}
        className="sidebar"
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,248,242,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#E8A44A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🍦</div>
            <div>
              <p style={{ color: '#FFF8F2', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                Helados del Valle
              </p>
              <p style={{ color: 'rgba(255,248,242,0.45)', fontSize: 10 }}>Sistema de gestión</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const activo = seccion === id
            return (
              <button
                key={id}
                onClick={() => { onNavegar(id); setMenuAbierto(false) }}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  borderLeft: activo ? '2px solid #E8A44A' : '2px solid transparent',
                  background: activo ? 'rgba(232,164,74,0.12)' : 'transparent',
                  color: activo ? '#E8A44A' : 'rgba(255,248,242,0.65)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={17} style={{ opacity: activo ? 1 : 0.7, flexShrink: 0 }} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Usuario */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,248,242,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#E8A44A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#3D2209',
            }}>A</div>
            <div>
              <p style={{ color: '#FFF8F2', fontSize: 12, fontWeight: 500 }}>Ana García</p>
              <p style={{ color: 'rgba(255,248,242,0.4)', fontSize: 10 }}>Administradora</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: 56,
          background: 'white',
          borderBottom: '1px solid #e7e5e4',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Botón hamburguesa (solo móvil via CSS) */}
            <button
              className="sidebar-toggle"
              onClick={() => setMenuAbierto((v) => !v)}
              style={{ background: 'none', border: 'none', padding: 4, color: '#78716c', display: 'none' }}
            >
              {menuAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span style={{ fontSize: 12, color: '#a8a29e' }}>Sistema</span>
            <ChevronRight size={12} style={{ color: '#d6d3d1' }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1c1917' }}>{modulo}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
              <input
                placeholder="Buscar…"
                style={{
                  paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                  border: '1px solid #e7e5e4', borderRadius: 8,
                  fontSize: 13, background: '#fafaf9',
                  width: 160, outline: 'none',
                }}
              />
            </div>
            <button
              style={{ position: 'relative', padding: 7, borderRadius: 8, border: 'none', background: 'transparent', color: '#78716c' }}
            >
              <Bell size={16} />
              {alertasCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                }} />
              )}
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#6B3F1C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#FFF8F2',
            }}>A</div>
          </div>
        </header>

        {/* Contenido */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            transform: translateX(-100%);
          }
          .sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

