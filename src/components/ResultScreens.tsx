import { useState } from 'react'
import { Grid, Screen, Sub, type Cell } from './Page'

export interface ResultData {
  ok: boolean
  /** Result grid; null when the server sent no result list (the handheld then skipped the grid). */
  grid: { cols: string[]; rows: Cell[][]; red: number[] } | null
  subtitle?: string
}

/** frm_*_Result -> frm_Successful / frm_Unsuccessful, then back to the main menu (per the user manual). */
export function ResultScreens({ process, data, onClose }: { process: string; data: ResultData; onClose: () => void }) {
  const [phase, setPhase] = useState<'grid' | 'final'>(data.grid ? 'grid' : 'final')

  if (phase === 'grid' && data.grid) {
    return (
      <Screen title={process} bar={[{ label: 'OK', onClick: () => setPhase('final') }]}>
        <Sub>{process} Result</Sub>
        {data.subtitle && <div className="docline">{data.subtitle}</div>}
        <Grid {...data.grid} />
      </Screen>
    )
  }

  const bar = [{ label: 'Back', onClick: onClose }, { label: 'OK', onClick: onClose }]
  return (
    <Screen title={process} bar={bar}>
      {data.ok ? (
        <div className="big green">Transaction Successful</div>
      ) : (
        <>
          <div className="big red-text">Transaction Unsuccessful</div>
          <div className="big red-text">Please Resend</div>
        </>
      )}
    </Screen>
  )
}

/** Handheld sorted result rows by status, so FAIL comes first and is shown in red. */
export function toGrid<T extends { status: string }>(items: T[], cols: string[], cells: (t: T) => Cell[]) {
  const sorted = [...items].sort((a, b) => a.status.localeCompare(b.status))
  return {
    cols,
    rows: sorted.map(cells),
    red: sorted.flatMap((t, i) => (t.status.toUpperCase() === 'FAIL' ? [i] : [])),
  }
}
