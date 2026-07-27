'use client'

import { Users } from 'lucide-react'
import CrudPage from '@/components/pages/CrudPage'

export default function Page() {
  return (
    <CrudPage
      title="Operadores" description="Motoristas e operadores de máquina"
      endpoint="operators" icon={Users}
      fields={[
        { name: 'name', label: 'Nome Completo', placeholder: 'Ex: João Silva' },
        { name: 'rfid', label: 'Cartão RFID', mono: true, placeholder: 'Ex: A1B2C3D4' },
        { name: 'license', label: 'CNH / Licença', placeholder: 'Ex: 123456789' },
        { name: 'shift', label: 'Turno', type: 'select', options: [
          { label: 'Diurno', value: 'Diurno' }, { label: 'Noturno', value: 'Noturno' }, { label: 'Misto', value: 'Misto' },
        ] },
      ]}
    />
  )
}
