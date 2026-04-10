const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Calendario({ year, month, entradas = [], onDayClick, onPrev, onNext }) {
  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const offset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < offset; i++) {
    const d = new Date(year, month, 1 - offset + i)
    cells.push({ day: d.getDate(), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEntries = entradas.filter(e => e.fecha === dateStr)
    const hasSindical = dayEntries.some(e => e.tipo === 'sindical')
    const hasEmpresa = dayEntries.some(e => e.tipo === 'empresa')
    const hasComp = dayEntries.some(e => e.tipo === 'compensacion')
    const totalH = dayEntries.reduce((s, e) => s + e.horas, 0)
    cells.push({
      day: d, current: true, date: dateStr, dayEntries, hasSindical, hasEmpresa, hasComp, totalH,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d
    })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, current: false })

  return (
    <div>
      <div className="cal-nav">
        <button className="btn btn-sm btn-ghost" onClick={onPrev}>‹</button>
        <span className="cal-nav-title">{MESES[month]} {year}</span>
        <button className="btn btn-sm btn-ghost" onClick={onNext}>›</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--accent-light)', border: 'rgba(28,78,138,0.2)', label: 'Sindical' },
          { color: 'var(--amber-light)', border: 'rgba(122,79,13,0.2)', label: 'Empresa' },
          { color: 'var(--green-light)', border: 'rgba(26,107,69,0.2)', label: 'Compensación' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, border: `1px solid ${l.border}`, display: 'inline-block' }} />
            {l.label}
          </span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>Pulsa un día para registrar horas</span>
      </div>
      <div className="cal-grid">
        {DIAS.map(d => <div key={d} className="cal-header-day">{d}</div>)}
        {cells.map((c, i) => {
          if (!c.current) return <div key={i} className="cal-day other-month">{c.day || ''}</div>
          let cls = 'cal-day'
          if (c.isToday) cls += ' today'
          if (c.hasEmpresa || c.hasComp) cls += ' has-empresa'
          else if (c.hasSindical) cls += ' has-sindical'
          const colors = []
          if (c.hasSindical) colors.push(<span key="s" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', marginRight: 2 }} />)
          if (c.hasEmpresa) colors.push(<span key="e" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block', marginRight: 2 }} />)
          if (c.hasComp) colors.push(<span key="c" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', marginRight: 2 }} />)
          return (
            <div key={i} className={cls} onClick={() => onDayClick && onDayClick(c.date, c.dayEntries)}>
              <div className="cal-day-num">{c.day}</div>
              {c.totalH > 0 && (
                <div className="cal-day-badge" style={{ color: c.hasEmpresa || c.hasComp ? 'var(--amber)' : 'var(--accent)' }}>
                  {c.totalH}h
                </div>
              )}
              {colors.length > 0 && <div style={{ display: 'flex', marginTop: 4 }}>{colors}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { MESES }
