import { useState, useEffect } from 'react'
import { Settings, Save, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'

export default function SessionSettings() {
  const [timeoutValue, setTimeoutValue] = useState('30')
  const [timeoutUnit, setTimeoutUnit] = useState('minutes')
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    api('/settings/sessionTimeout')
      .then(res => {
        if (res.value) {
          const val = parseInt(res.value, 10)
          if (val >= 1440 && val % 1440 === 0) {
            setTimeoutValue((val / 1440).toString())
            setTimeoutUnit('days')
          } else if (val >= 60 && val % 60 === 0) {
            setTimeoutValue((val / 60).toString())
            setTimeoutUnit('hours')
          } else {
            setTimeoutValue(val.toString())
            setTimeoutUnit('minutes')
          }
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoad(false))
  }, [])

  const handleSave = async () => {
    let minutes = parseInt(timeoutValue, 10)
    if (isNaN(minutes) || minutes <= 0) {
      toast.error('Informe um valor numérico válido maior que zero.')
      return
    }
    if (minutes > 999) {
      toast.error('O valor máximo é 999.')
      return
    }

    if (timeoutUnit === 'hours') minutes *= 60
    if (timeoutUnit === 'days') minutes *= 1440

    setLoading(true)
    try {
      await api('/settings/sessionTimeout', {
        method: 'PUT',
        body: JSON.stringify({ value: minutes.toString() })
      })
      toast.success('Tempo de expiração de sessão atualizado com sucesso!')
      
      // Update locally immediately to affect current session
      localStorage.setItem('globalSessionTimeout', minutes.toString())
    } catch (e) {
      toast.error('Erro ao salvar configuração.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoad) return <div className="animate-pulse bg-card p-6 rounded-xl border border-border/40 h-24 mb-6"></div>

  return (
    <div className="bg-card/50 backdrop-blur-md p-6 rounded-xl border border-border/40 mb-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-lg">
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Expiração de Sessão Global
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider border border-primary/30">Admin</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Configure o tempo máximo de inatividade antes que o sistema desconecte automaticamente todos os usuários.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <input 
          type="number" 
          min="1" 
          max="999"
          value={timeoutValue}
          onChange={e => setTimeoutValue(e.target.value)}
          className="w-full sm:w-24 bg-background border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select 
          value={timeoutUnit}
          onChange={e => setTimeoutUnit(e.target.value)}
          className="w-full sm:w-32 bg-background border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="minutes">Minutos</option>
          <option value="hours">Horas</option>
          <option value="days">Dias</option>
        </select>
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto gap-2">
          {loading ? <span className="animate-spin text-lg">⚙</span> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}
