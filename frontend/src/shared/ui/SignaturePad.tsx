import { useEffect, useRef } from 'react'
import { Button } from 'antd'

type SignaturePadProps = {
  /** Existing signature (data URL) to display, e.g. when re-opening a form. */
  value?: string
  /** Fires with a PNG data URL on every completed stroke, or undefined after Clear. */
  onChange?: (dataUrl: string | undefined) => void
  width?: number
  height?: number
  disabled?: boolean
}

/**
 * A signature capture surface: draw directly with mouse, stylus or finger via
 * the Pointer Events API (one handler set covers all three input types), not
 * a file picker — a customer authorising a quote or a handover signs on the
 * spot, they don't have a signature image sitting on their device to upload.
 */
export function SignaturePad({ value, onChange, width = 360, height = 140, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const hasInkRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Backing store at devicePixelRatio so strokes stay crisp on high-DPI
  // screens, scaled back down to `width`/`height` via CSS.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1f1f1f'
    hasInkRef.current = false
  }, [width, height])

  // Render an incoming value (e.g. a signature already captured earlier in
  // this session) onto the canvas so re-opening the form shows it.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      hasInkRef.current = false
      return
    }
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, width, height)
      hasInkRef.current = true
    }
    img.src = value
    // Only re-draw when the value identity changes from outside (e.g. modal
    // reset) — a stroke's own onChange must not loop back into a redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastPointRef.current = getPoint(event)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lastPointRef.current) return
    const point = getPoint(event)
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    hasInkRef.current = true
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (canvas && hasInkRef.current) {
      onChange?.(canvas.toDataURL('image/png'))
    }
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInkRef.current = false
    onChange?.(undefined)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          background: '#fff',
          border: '1px dashed #d9d9d9',
          borderRadius: 8,
          display: 'block',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <Button disabled={disabled} onClick={handleClear} size="small" style={{ marginTop: 6 }}>
        Clear
      </Button>
    </div>
  )
}
