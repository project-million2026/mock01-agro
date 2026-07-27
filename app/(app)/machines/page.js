'use client'

import { useRouter } from 'next/navigation'
import { Tractor, MapPinned } from 'lucide-react'
import CrudPage from '@/components/pages/CrudPage'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const router = useRouter()
  const { deviceTypes } = useSession()
  return (
    <CrudPage
      title="Frotas" description="Cadastro de tratores, colheitadeiras e pulverizadores"
      endpoint="fleets" icon={Tractor}
      extraAction={{
        label: 'Ver Telemetria', icon: MapPinned,
        handler: (item) => router.push(`/telemetry?fleet=${encodeURIComponent(item.fleet_number)}`),
      }}
      fields={[
        { name: 'fleet_number', label: 'Nº Frota', mono: true, placeholder: 'Ex: TR-001' },
        { name: 'type', label: 'Tipo', placeholder: 'Trator, Colheitadeira...' },
        { name: 'brand', label: 'Marca', placeholder: 'John Deere, Case...' },
        { name: 'model', label: 'Modelo', placeholder: 'Ex: 8R 410' },
        { name: 'year', label: 'Ano', type: 'number', placeholder: '2023' },
        { name: 'flespi_ident', label: 'IMEI do Rastreador (Flespi)', placeholder: 'Ex: 864500000000000' },
        { name: 'flespi_device_type_id', label: 'Tipo de Dispositivo Flespi', type: 'select', options: deviceTypes },
        { name: 'hourly_rate', label: 'Taxa de Faturamento (R$/h)', type: 'number', placeholder: 'Ex: 150.00' },
      ]}
    />
  )
}
