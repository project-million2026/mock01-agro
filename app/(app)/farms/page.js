'use client'

import { MapPinned } from 'lucide-react'
import CrudPage from '@/components/pages/CrudPage'

export default function Page() {
  return (
    <CrudPage
      title="Fazendas" description="Cadastro de propriedades rurais"
      endpoint="farms" icon={MapPinned}
      fields={[
        { name: 'name', label: 'Nome da Fazenda', placeholder: 'Ex: Fazenda Boa Esperança' },
        { name: 'city', label: 'Localização (Estado e Município)', type: 'ibge-location' },
        { name: 'total_area', label: 'Área Total (ha)', type: 'number', placeholder: '5000' },
        { name: 'polygon', label: 'Área da Fazenda (Mapa)', type: 'polygon' },
      ]}
    />
  )
}
