import { Link } from 'react-router-dom'
import { useSession } from '../state/session'
import { useUi } from '../state/ui'

const ITEMS = [
  ['/receipt', 'Receipt'],
  ['/stock-in', 'Stock In'],
  ['/change-location', 'Change Location'],
  ['/oversea', 'Shipping Oversea'],
  ['/rfs', 'Shipping RFS'],
  ['/stock-out', 'Request Stock Out'],
] as const

export function Menu() {
  const { session, logout } = useSession()
  const { confirm } = useUi()
  return (
    <div className="page">
      <header className="bar">
        <h1>IPOS</h1>
        <span className="user">{session?.userName}</span>
        <button className="btn btn-ghost" onClick={async () => (await confirm('Do you want to logout ?')) && logout()}>Logout</button>
      </header>
      <main className="menu">
        {ITEMS.map(([to, label]) => (
          <Link key={to} to={to} className="btn btn-primary tile">{label}</Link>
        ))}
      </main>
    </div>
  )
}
