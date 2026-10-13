import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  /** Called on Enter (hardware scanners send Enter after the code) or after a camera scan. */
  onSubmit: (v: string) => void
  placeholder?: string
  disabled?: boolean
  inputMode?: 'text' | 'numeric'
  autoFocus?: boolean
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => Detector
  }
}

export function ScanInput({ value, onChange, onSubmit, placeholder, disabled, inputMode = 'text', autoFocus = true }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [camera, setCamera] = useState(false)
  const hasCamera = typeof window !== 'undefined' && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => {
    if (autoFocus && !disabled && !camera) ref.current?.focus()
  }, [autoFocus, disabled, camera])

  return (
    <>
      <div className="scan">
        <input
          ref={ref}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit(value.trim())
            }
          }}
          onFocus={(e) => e.target.select()}
        />
        {hasCamera && (
          <button type="button" className="btn" disabled={disabled} onClick={() => setCamera(true)} aria-label="Scan with camera">
            📷
          </button>
        )}
      </div>
      {camera && (
        <CameraScanner
          onClose={() => setCamera(false)}
          onResult={(v) => {
            setCamera(false)
            onChange(v)
            onSubmit(v.trim())
          }}
        />
      )}
    </>
  )
}

function CameraScanner({ onResult, onClose }: { onResult: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream: MediaStream | undefined
    let stopped = false
    let raf = 0
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const detector = new window.BarcodeDetector!()
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const codes = await detector.detect(video.current)
            if (codes[0]?.rawValue) {
              onResult(codes[0].rawValue)
              return
            }
          } catch {
            /* frame not ready */
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setError('Cannot open the camera. Check browser permission (HTTPS is required).')
      }
    })()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {error ? <p>{error}</p> : <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 8 }} />}
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
