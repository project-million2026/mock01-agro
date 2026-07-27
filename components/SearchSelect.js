'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronsUpDown, Check, Search } from 'lucide-react'

// Select com busca (combobox). options: [{ value, label, hint }]. Busca por label + hint.
export default function SearchSelect({ options = [], value, onChange, placeholder = 'Selecione…', disabled }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = options.find(o => String(o.value) === String(value))
  // Busca por nome OU número OU os dois: cada termo digitado precisa aparecer em algum lugar
  // (label = nome, hint = número/SKU/marca). Assim "correia", "1234" ou "correia 1234" funcionam.
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  const filtered = terms.length
    ? options.filter(o => {
      const hay = `${o.label} ${o.hint || ''}`.toLowerCase()
      return terms.every(t => hay.includes(t))
    })
    : options

  return (
    <div className="relative" ref={ref}>
      <button
        type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
      >
        <span className={selected ? 'truncate' : 'text-muted-foreground truncate'}>{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nome ou número…"
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nada encontrado</p>}
            {filtered.map(o => (
              <button
                key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ('') }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
              >
                <span className="truncate">{o.label}{o.hint && <span className="text-xs text-muted-foreground ml-2">{o.hint}</span>}</span>
                {String(o.value) === String(value) && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
