/**
 * App.jsx — Punto de entrada con sidebar layout.
 * Reemplaza la navegación por pestañas con la barra lateral de Figma.
 */
import { useEffect, useState } from 'react'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import InsumosPage from './pages/InsumosPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ProductosPage from './pages/ProductosPage.jsx'
import RecetasPage from './pages/RecetasPage.jsx'
import VentasPage from './pages/VentasPage.jsx'
import EventosPage from './pages/EventosPage.jsx'
import { inventarioApi } from './services/api.js'
import './index.css'

export default function App() {
  const [seccion, setSeccion] = useState('dashboard')
  const [alertasCount, setAlertasCount] = useState(0)

  // Cargamos el número de alertas una vez para el badge del topbar
  useEffect(() => {
    let cancelado = false
    inventarioApi.alertas()
      .then((data) => {
        if (!cancelado) setAlertasCount((data.alertas || []).length)
      })
      .catch(() => {})
    return () => { cancelado = true }
  }, [])

  return (
    <Layout seccion={seccion} onNavegar={setSeccion} alertasCount={alertasCount}>
      {seccion === 'dashboard'  && <DashboardPage />}
      {seccion === 'insumos'    && <InsumosPage />}
      {seccion === 'inventario' && <InventarioPage />}
      {seccion === 'productos'  && <ProductosPage />}
      {seccion === 'recetas'    && <RecetasPage />}
      {seccion === 'ventas'     && <VentasPage />}
      {seccion === 'eventos'    && <EventosPage />}
    </Layout>
  )
}
