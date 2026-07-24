import React, { useEffect, useRef, useState } from 'react'

export function LineChart({
  data,
  height = 160,
  formatValue = (v: number) => String(v),
  showGrid = false,
  showYAxis = false,
}: {
  data: Array<{ label: string; value: number }>
  height?: number
  formatValue?: (v: number) => string
  showGrid?: boolean
  showYAxis?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) return null

  const padL = showYAxis ? 36 : 8
  const padR = 10
  const padT = 22
  const padB = 10
  const chartW = Math.max(1, width - padL - padR)
  const chartH = Math.max(1, height - padT - padB)

  const rawMax = Math.max(1, ...data.map((d) => d.value))
  const niceMax = (() => {
    if (!showYAxis && !showGrid) return rawMax
    if (rawMax <= 5) return 5
    if (rawMax <= 10) return 10
    return Math.ceil(rawMax / 10) * 10
  })()
  const yTicks = showYAxis || showGrid ? 5 : 0

  const pts = data.map((d, i) => ({
    x: data.length === 1 ? padL + chartW / 2 : padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - (d.value / niceMax) * chartH,
    ...d,
  }))

  const path =
    pts.length === 1
      ? `M${pts[0]!.x - 12},${pts[0]!.y} L${pts[0]!.x + 12},${pts[0]!.y}`
      : pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const area =
    pts.length === 1
      ? `M${first.x - 12},${first.y} L${first.x + 12},${first.y} L${first.x + 12},${height - padB} L${first.x - 12},${height - padB} Z`
      : `${path} L${last.x.toFixed(1)},${height - padB} L${first.x.toFixed(1)},${height - padB} Z`

  const labelStep = Math.max(1, Math.ceil(data.length / 8))
  const uid = React.useId().replace(/:/g, '')
  const gradId = `lc-area-${uid}`

  return (
    <div ref={wrapRef} style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      {width > 0 && (
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', maxWidth: '100%' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const frac = i / yTicks
            const y = padT + chartH * (1 - frac)
            const val = Math.round(niceMax * frac)
            return (
              <g key={i}>
                {showGrid && (
                  <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e5ebe7" strokeWidth={1} />
                )}
                {showYAxis && (
                  <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#93a89a" fontFamily="inherit">
                    {val}
                  </text>
                )}
              </g>
            )
          })}

          {!showGrid && (
            <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#e5ebe7" strokeWidth={1} />
          )}

          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={path}
            fill="none"
            stroke="#16a34a"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) => {
            const showLabel =
              data.length <= 14 || i === 0 || i === pts.length - 1 || p.value === rawMax || i % labelStep === 0
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={4.5} fill="#16a34a" stroke="#fff" strokeWidth={2} />
                {showLabel && (
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#64796c"
                    fontWeight={600}
                    fontFamily="inherit"
                  >
                    {formatValue(p.value)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `2px ${padR}px 0 ${padL}px` }}>
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <span
              key={i}
              style={{
                fontSize: 10.5,
                color: 'var(--muted)',
                flex: 1,
                textAlign: i === 0 ? 'left' : i === data.length - 1 ? 'right' : 'center',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {d.label}
            </span>
          ) : (
            <span key={i} style={{ flex: 1 }} />
          ),
        )}
      </div>
    </div>
  )
}

export function BarChart({
  data,
  height = 160,
}: {
  data: Array<{ label: string; value: number }>
  height?: number
}) {
  if (data.length === 0) return null
  const max = Math.max(1, ...data.map((d) => d.value))
  const labelStep = Math.max(1, Math.ceil(data.length / 12))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 14 ? 4 : 10, height, padding: '0 6px' }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 82
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                height: '100%',
                justifyContent: 'flex-end',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>{d.value}</span>
              <div
                style={{
                  width: '100%',
                  maxWidth: data.length > 14 ? 18 : 34,
                  height: d.value === 0 ? 2 : `${Math.max(pct, 4)}%`,
                  borderRadius: '5px 5px 2px 2px',
                  background: d.value === 0 ? '#e5ebe7' : 'linear-gradient(180deg, #22c55e, #16a34a)',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: data.length > 14 ? 4 : 10, padding: '4px 6px 0' }}>
        {data.map((d, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10.5,
              color: 'var(--muted)',
              visibility: i % labelStep === 0 || i === data.length - 1 ? 'visible' : 'hidden',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Donut({
  parts,
  centerLabel,
  centerValue,
  size = 150,
}: {
  parts: Array<{ label: string; value: number; color: string }>
  centerLabel?: string
  centerValue?: string
  size?: number
}) {
  const total = Math.max(
    1e-9,
    parts.reduce((s, p) => s + p.value, 0),
  )
  const r = 15.9
  let offset = 25
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg viewBox="0 0 42 42" style={{ width: size, height: size, flexShrink: 0 }}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="#eef1ef" strokeWidth="6" />
        {parts.map((p, i) => {
          const frac = (p.value / total) * 100
          const el = (
            <circle
              key={i}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="6"
              strokeDasharray={`${frac} ${100 - frac}`}
              strokeDashoffset={offset}
            />
          )
          offset -= frac
          return el
        })}
        {centerValue && (
          <>
            <text x="21" y="20" textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#1b2a21">
              {centerValue}
            </text>
            {centerLabel && (
              <text x="21" y="25.5" textAnchor="middle" fontSize="2.8" fill="#64796c">
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {parts.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--muted)' }}>{p.label}</span>
            <strong>{Math.round((p.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
