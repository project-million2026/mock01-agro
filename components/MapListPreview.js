'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/apiClient'
import { MapIcon } from 'lucide-react'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center bg-black/20 animate-pulse rounded-xl"><p className="text-muted-foreground">Carregando mapa...</p></div> })

export default function MapListPreview({ title = "Visão Geral no Mapa" }) {
  const [data, setData] = useState({ farms: [], fields: [], buildings: [], positions: [] })

  useEffect(() => {
    let active = true
    api('/dashboard/positions').then(res => {
      if (active) setData({ farms: res.farms || [], fields: res.fields || [], buildings: res.buildings || [], positions: [] })
    }).catch(console.error)
    return () => { active = false }
  }, [])

  return (
    <div className="mb-6 border border-border rounded-xl overflow-hidden bg-black/20 shadow-lg">
      <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
        <MapIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <MapView farms={data.farms} fields={data.fields} buildings={data.buildings} positions={data.positions} height={350} />
    </div>
  )
}
