import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Login } from './pages/Login'
import { Menu } from './pages/Menu'
import { Oversea } from './pages/Oversea'
import { Receipt } from './pages/Receipt'
import { Rfs } from './pages/Rfs'
import { StockOut } from './pages/StockOut'
import { TagShelf } from './pages/TagShelf'
import { SessionProvider, useSession } from './state/session'
import { UiProvider } from './state/ui'

function Private({ children }: { children: ReactNode }) {
  const { session } = useSession()
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

export function App() {
  return (
    <BrowserRouter>
      <UiProvider>
        <SessionProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Private><Menu /></Private>} />
            <Route path="/receipt" element={<Private><Receipt /></Private>} />
            <Route path="/stock-in" element={<Private><TagShelf title="Stock In" storageKey="stock-in" endpoint="/handheld/receipt/stockin" shelfField="shelfNo" shelfLabel="Shelf" /></Private>} />
            <Route path="/change-location" element={<Private><TagShelf title="Change Location" storageKey="change-location" endpoint="/handheld/shelfs/change" shelfField="toShelf" shelfLabel="Go To Shelf" /></Private>} />
            <Route path="/oversea" element={<Private><Oversea /></Private>} />
            <Route path="/rfs" element={<Private><Rfs /></Private>} />
            <Route path="/stock-out" element={<Private><StockOut /></Private>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SessionProvider>
      </UiProvider>
    </BrowserRouter>
  )
}
