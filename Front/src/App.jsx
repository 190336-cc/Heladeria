import { useState } from 'react'
import InsumosPage from './pages/InsumosPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ProductosPage from './pages/ProductosPage.jsx'
import './App.css'

const SECCIONES = [
  { id: 'inventario', etiqueta: '📦 Inventario' },
  { id: 'insumos', etiqueta: '🧂 Insumos' },
  { id: 'productos', etiqueta: '🍨 Productos' },
]

export default function App() {
  const [seccion, setSeccion] = useState('inventario')

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="app-logo-icono">🍦</span>
            <span className="app-logo-nombre">Helados del Valle</span>
          </div>
          <nav className="app-nav" aria-label="Navegación principal">
            {SECCIONES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`nav-btn ${seccion === s.id ? 'nav-btn-activo' : ''}`}
                onClick={() => setSeccion(s.id)}
                aria-current={seccion === s.id ? 'page' : undefined}
              >
                {s.etiqueta}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {seccion === 'inventario' && <InventarioPage />}
        {seccion === 'insumos' && <InsumosPage />}
        {seccion === 'productos' && <ProductosPage />}
      </main>

      <footer className="app-footer">
        <p>Helados del Valle — Sistema de gestión interno</p>
      </footer>
    </div>
  )
}
