import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Page'
import { useSession } from '../state/session'
import { useUi } from '../state/ui'

const ITEMS = [
  ['/receipt', 'Receipt'],
  ['/stock-in', 'Stock In'],
  ['/change-location', 'Change Location'],
  ['/oversea', 'Shipping (Oversea)'],
  ['/rfs', 'Shipping (RFS)'],
  ['/stock-out', 'Request Stock Out'],
] as const

export function Menu() {
  const nav = useNavigate()
  const { session, logout } = useSession()
  const { confirm } = useUi()
  return (
    <Screen
      title="Main Menu"
      user={session?.userName}
      bar={[{ label: 'Logout', onClick: async () => (await confirm('Do you want to logout ?', 'Exit (Y/N).')) && logout() }]}
    >
      <div className="menu">
        {ITEMS.map(([to, label]) => (
          <button key={to} className="btn btn-menu" onClick={() => nav(to)}>{label}</button>
        ))}
      </div>
    </Screen>
  )
}
