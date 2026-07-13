'use client'

import { useState, useEffect } from 'react'
import { 
  Search, ChevronRight, BookOpen, Loader2, Home, Play, 
  Type, ScrollText, Code, BadgePlus, Cloud, Wrench, 
  Download, RotateCw, Bluetooth, FileCode, Book, 
  MonitorPlay, Crosshair, Settings, ArrowRightToLine, FileText,
  LayoutGrid, ToggleLeft, Braces, Newspaper, MessageSquare,
  Usb, CreditCard, Target, SplitSquareHorizontal, Wifi,
  RadioTower, Network, CarFront, AlertTriangle, MapPin,
  Bug, List, Activity, Moon, Lock, Satellite, Smartphone,
  RefreshCw, Shield, Camera, ListChecks, Music
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const MENU_GROUPS = [
  {
    name: 'Linha Virloc',
    items: [
      { path: 'home', icon: Home, overrideTitle: 'Home' },
      { path: 'primeiros_passos', icon: Play, overrideTitle: 'Primeiros passos' },
      { path: 'dicionario-xvm', icon: Type, overrideTitle: 'Dicionário XVM' },
      { path: 'scripts-e-exemplos', icon: ScrollText, overrideTitle: 'Scripts Padrão' },
      { path: 'protocolo-xvm', icon: Code, overrideTitle: 'Protocolo XVM' },
      { path: 'download-novo-xvm-terminal', icon: BadgePlus, overrideTitle: 'Novo XVM Terminal' },
      { path: 'vl06-guia-homologacao', icon: Cloud, overrideTitle: 'VL06 - Guia de Homologação' },
      { path: 'vl08-guia-homologacao', icon: Cloud, overrideTitle: 'VL08 - Guia de Homologação' },
      { path: 'gatewaycan-guia-homologacao', icon: Cloud, overrideTitle: 'Gateway CAN - Guia de homologação' },
      { path: 'Guia_homologação_smart5', icon: Cloud, overrideTitle: 'ECO5, SMART5 e PRO5LITE Guia de Homologação' },
      { path: 'ferramentas', icon: Wrench, overrideTitle: 'Softwares e Manuais' },
      { path: 'firmwares', icon: Download, overrideTitle: 'Firmwares para Download' },
      { path: 'fw-update-new-xvm', icon: RotateCw, overrideTitle: 'Atualização  de Firmware' },
      { path: 'bluetoothvl', icon: Bluetooth, overrideTitle: 'Bluetooth' },
      { path: 'script', icon: FileCode, overrideTitle: 'Embarque de script' },
      { path: 'Data-sheet', icon: Book, overrideTitle: 'Datasheets' },
    ]
  },
  {
    name: 'Plataformas',
    items: [
      { path: 'configurador-systemsat', icon: FileText, overrideTitle: 'Systemsat Performance' },
      { path: 'gurtam-wialon', icon: Crosshair, overrideTitle: 'Gurtam/Wialon' },
    ]
  },
  {
    name: 'Ferramentas',
    items: [
      { path: 'configurador-vl8-instalação', icon: ArrowRightToLine, overrideTitle: 'Configurador VL8 - Instalação' },
      { path: 'Configurador-VL8-Configuração-pt1', icon: FileText, overrideTitle: 'Configurador VL8 PT.1' },
      { path: 'Configurador-VL8-Configuração-pt2', icon: FileText, overrideTitle: 'Configurador VL8 PT.2' },
    ]
  },
  {
    name: 'Programação XVM',
    items: [
      { path: 'eventos', icon: ChevronRight, overrideTitle: 'Eventos' },
      { path: 'vl6-disparadores-condicionais', icon: ChevronRight, overrideTitle: 'Disparadores e Condicionais' },
      { path: 'destinos', icon: ChevronRight, overrideTitle: 'Destinos' },
      { path: 'reportes', icon: ChevronRight, overrideTitle: 'Reportes' },
      { path: 'variaveisvl6', icon: ChevronRight, overrideTitle: 'Variáveis' },
      { path: 'acoes-xvm', icon: ChevronRight, overrideTitle: 'Ações' },
      { path: 'vc7-telas', icon: FileText, overrideTitle: 'Vircom' },
      { path: 'VC7_Checklist', icon: FileText, overrideTitle: 'Vircom - Checklist' },
    ]
  },
  {
    name: 'VL06',
    items: [
      { path: 'hardware-vl6', icon: LayoutGrid, overrideTitle: 'VL06 - Hardware' },
      { path: 'entradas-saidas-vl6', icon: ToggleLeft, overrideTitle: 'VL06 - Entradas e Saídas' },
      { path: 'propriedades-firmware-vl6', icon: Braces, overrideTitle: 'Propriedades de Firmware' },
      { path: 'notas-de-release-vl6', icon: Newspaper, overrideTitle: 'Notas de Release de Firmware' },
      { path: 'configuracoes-gerais-vl6', icon: Settings, overrideTitle: 'Configurações Gerais' },
      { path: 'consultas', icon: Search, overrideTitle: 'Consultas' },
      { path: 'rede-can-vl6', icon: Network, overrideTitle: 'Rede CAN' },
      { path: 'cercas', icon: MapPin, overrideTitle: 'Cercas' },
      { path: 'sleepvl6', icon: Moon, overrideTitle: 'Modo SLEEP' },
      { path: 'debugvl6', icon: Bug, overrideTitle: 'Modos de Debug' },
      { path: 'rfidvl6', icon: CreditCard, overrideTitle: 'Integração Serial' },
      { path: '1-wire-vl6', icon: Target, overrideTitle: 'OneWire' },
      { path: 'acelerometro-vl6', icon: SplitSquareHorizontal, overrideTitle: 'Acelerômetro' },
      { path: 'pulsos-vl6', icon: Activity, overrideTitle: 'Leitura de Pulsos' },
      { path: 'configsvs', icon: Settings, overrideTitle: 'Configurações VS08 e VS16' },
      { path: 'sms-vl6', icon: MessageSquare, overrideTitle: 'Mensagens SMS' },
      { path: 'buffer-e-log-vl6', icon: List, overrideTitle: 'Buffer e LOG' },
      { path: 'vl6-protecao-canal', icon: Lock, overrideTitle: 'Proteção da Programação' },
      { path: 'vl6-globalstar', icon: FileText, overrideTitle: 'Integração com Satelital' },
    ]
  },
  {
    name: 'VL08 | VL12 | VC07 | VCONE F4',
    items: [
      { path: 'vl8', icon: LayoutGrid, overrideTitle: 'VL08 - Hardware' },
      { path: 'entradas-saidas-vl8', icon: ToggleLeft, overrideTitle: 'VL08 - Entradas e Saídas' },
      { path: 'vc7', icon: LayoutGrid, overrideTitle: 'VC07 - Hardware' },
      { path: 'entradas-saidas-vc7', icon: ToggleLeft, overrideTitle: 'VC07 - Entradas e Saídas' },
      { path: 'vl12', icon: LayoutGrid, overrideTitle: 'VL12 - Hardware' },
      { path: 'entradas-saidas-vl12', icon: ToggleLeft, overrideTitle: 'VL12 - Entradas e saídas' },
      { path: 'vcone108', icon: LayoutGrid, overrideTitle: 'VCONE F4 - Hardware' },
      { path: 'entradas-saidas-vcone-108', icon: ToggleLeft, overrideTitle: 'VCONE F4 - Entradas e saídas' },
      { path: 'propriedades-firmware-vl8-vl12-vc7', icon: Braces, overrideTitle: 'Propriedades de Firmware' },
      { path: 'notas-de-release-f4', icon: Newspaper, overrideTitle: 'Notas de Release de Firmware' },
      { path: 'configuracoes-gerais', icon: Settings, overrideTitle: 'Configurações Gerais' },
      { path: 'consultas-f4', icon: Search, overrideTitle: 'Consultas' },
      { path: 'sms-f4', icon: MessageSquare, overrideTitle: 'Mensagens SMS' },
      { path: 'audio-embarcado', icon: Music, overrideTitle: 'Áudio Embarcado' },
      { path: 'serial-f4', icon: Usb, overrideTitle: 'Configuração Serial' },
      { path: 'RFID-Integrado', icon: FileText, overrideTitle: 'Leitor RFID Integrado' },
      { path: '1-wire-vl8-vc8-vl12', icon: Target, overrideTitle: 'OneWire' },
      { path: 'acelerometro-vl8-vl12-vc7', icon: SplitSquareHorizontal, overrideTitle: 'Acelerômetro' },
      { path: 'wifi-f4', icon: Wifi, overrideTitle: 'Wi-Fi e Bluetooth' },
      { path: 'novo-bt-fc41d', icon: FileText, overrideTitle: 'BLE - Bluetooth Low Energy' },
      { path: 'lora-mesh', icon: RadioTower, overrideTitle: 'Rede Lora Mesh' },
      { path: 'configuracoes-can-f4', icon: Settings, overrideTitle: 'Rede CAN' },
      { path: 'f4-can-obd2', icon: BookOpen, overrideTitle: 'Rede CAN OBD2' },
      { path: 'rede-can-dtcs', icon: AlertTriangle, overrideTitle: 'Rede CAN DTCs' },
      { path: 'cercas-f4', icon: MapPin, overrideTitle: 'Regiões e cercas' },
      { path: 'debugf4', icon: Bug, overrideTitle: 'Modos de Debug' },
      { path: 'f4-LOG', icon: List, overrideTitle: 'Caixa Preta - LOG1 e LOG2' },
      { path: 'f4-lex', icon: FileText, overrideTitle: 'Caixa Preta - LOG Estendido' },
      { path: 'pulsos-f4', icon: Activity, overrideTitle: 'Leitura de Pulsos' },
      { path: 'modo-sleep-vl8-vl12-vc7', icon: Moon, overrideTitle: 'Modo SLEEP' },
      { path: 'f4-protecao-canal', icon: Lock, overrideTitle: 'Proteção da Programação' },
    ]
  },
  {
    name: 'GATEWAY CAN',
    items: [
      { path: 'hardware-gatewaycan', icon: LayoutGrid, overrideTitle: 'Gateway CAN - Hardware' },
      { path: 'entradas-saidas-gatewaycan', icon: ToggleLeft, overrideTitle: 'Gateway CAN - Entradas e Saídas' },
      { path: 'propriedades-firmware-gatewaycan', icon: Braces, overrideTitle: 'Propriedades de Firmware' },
      { path: 'app-gatewaycan', icon: Smartphone, overrideTitle: 'Gateway CAN - Aplicativo' },
      { path: 'integracao-JC', icon: RefreshCw, overrideTitle: 'Integração JC450 + GW CAN' },
      { path: 'Gatewaycan_Homologação_Wialon', icon: Shield, overrideTitle: 'Gateway CAN - Wialon' },
      { path: 'AG600-ConfigBas', icon: Settings, overrideTitle: 'Configurações Básicas' },
      { path: 'AG600-config-avan', icon: Settings, overrideTitle: 'Configurações Avançadas' },
      { path: 'AG600-DMS', icon: Camera, overrideTitle: 'AG600 - DMS' },
      { path: 'AG600-Instalação', icon: BookOpen, overrideTitle: 'Guia de Instalação' },
    ]
  },
  {
    name: 'SMART5',
    items: [
      { path: 'Smart5-Hardware', icon: LayoutGrid, overrideTitle: 'Smart5 - Hardware' },
      { path: 'Smart5-Entrada_e_Saidas', icon: ToggleLeft, overrideTitle: 'Smart5 - Entradas e Saídas' },
      { path: 'SMART5_preparação', icon: Settings, overrideTitle: 'Smart5 - Ligando em bancada' },
      { path: 'Smart5_Configuração', icon: Settings, overrideTitle: 'Smart5 - Configuração' },
      { path: 'Configurador_Ruptela_Smart5', icon: Settings, overrideTitle: 'Configurador Smart5' },
      { path: 'Smart5-Cercas', icon: MapPin, overrideTitle: 'Geocergas - Configurador' },
      { path: 'Smart5-Instalação_no_veiculo', icon: Wrench, overrideTitle: 'Smart5 - Guia de Instalação' },
    ]
  },
  {
    name: 'ECO5',
    items: [
      { path: 'hardware_eco5', icon: LayoutGrid, overrideTitle: 'ECO5 - Hardware' },
      { path: 'Entradas_e_saidas_eco5', icon: ToggleLeft, overrideTitle: 'ECO5 - Entradas e Saídas' },
    ]
  },
  {
    name: 'VCONE 104',
    items: [
      { path: 'lora-mesh', icon: RadioTower, overrideTitle: 'Rede Lora Mesh' },
      { path: 'propriedades-firmware-vcone', icon: Braces, overrideTitle: 'Propriedades de Firmware' },
      { path: 'entradas-saidas-vcone', icon: ToggleLeft, overrideTitle: 'Entradas e saídas' },
      { path: 'configuracoes-gerais-vcone', icon: Settings, overrideTitle: 'Configurações gerais' },
      { path: 'consultas-vcone', icon: Search, overrideTitle: 'Consultas' },
    ]
  },
  {
    name: 'Sensores AS',
    items: [
      { path: 'Aplicativo-Akcess-ble', icon: FileText, overrideTitle: 'AKCESS BLE' },
    ]
  },
  {
    name: 'Outras Informações',
    items: [
      { path: 'lib-can', icon: Book, overrideTitle: 'BIblioteca CAN' },
      { path: 'dicionário-telemetria', icon: FileText, overrideTitle: 'Dicionário de Telemetria' },
      { path: 'bandas-vl', icon: FileText, overrideTitle: 'Tecnologias e Bandas' },
      { path: 'identificação-2g-4g', icon: FileText, overrideTitle: 'Identificação módulos 2G e 4G' },
      { path: 'info-anatel', icon: FileText, overrideTitle: 'Informações Anatel' },
      { path: 'fota32', icon: FileText, overrideTitle: 'Protocolo FOTA32' },
      { path: 'definicao-pulsos', icon: FileText, overrideTitle: 'Definição de Pulsos' },
      { path: 'ip-terminal', icon: FileText, overrideTitle: 'IP Terminal' },
      { path: 'vot-out1-telefonica', icon: FileText, overrideTitle: 'Adaptação Cabo VL07' },
      { path: 'montagem_vl12_full', icon: FileText, overrideTitle: 'Montagem VL12 FULL' },
    ]
  },
]




export default function WikiPage() {
  const [index, setIndex] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPage, setSelectedPage] = useState(null)
  const [pageContent, setPageContent] = useState('')
  const [toc, setToc] = useState([])
  const [pageLoading, setPageLoading] = useState(false)

  useEffect(() => {
    fetch('/wiki/_index.json')
      .then(res => res.json())
      .then(data => {
        setIndex(data)
        setLoading(false)
        if (data.pages && data.pages.length > 0) {
          const home = data.pages.find(p => p.path === 'home') || data.pages[0]
          loadPage(home)
        }
      })
      .catch(err => {
        console.error('Error loading wiki index', err)
        setLoading(false)
      })
  }, [])

  const loadPage = async (pageObj) => {
    setSelectedPage(pageObj)
    setPageLoading(true)
    try {
      const res = await fetch(`/wiki/${pageObj.dir.replace(/\\/g, '/')}/render.html`)
      let html = await res.text()
      
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // Fix images
      doc.querySelectorAll('img[src], source[src], video[src]').forEach(img => {
        let src = img.getAttribute('src')
        if (src) {
          if (src.startsWith('https://wiki.newtectelemetria.com.br/')) {
            src = src.replace('https://wiki.newtectelemetria.com.br', '')
          }
          if (!src.startsWith('http') && !src.startsWith('data:')) {
            if (src.startsWith('/')) {
              img.src = '/wiki/assets' + decodeURIComponent(src)
            } else {
              const base = pageObj.dir.replace(/\\/g, '/') + '/'
              img.src = '/wiki/' + base + decodeURIComponent(src)
            }
          }
        }
      })

      // Generate TOC
      const tocItems = []
      doc.querySelectorAll('h1, h2, h3').forEach(heading => {
        const id = heading.id || heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
        heading.id = id
        tocItems.push({
          id,
          title: heading.textContent.replace('¶', '').replace(/^[?\s]+/, '').trim(),
          level: parseInt(heading.tagName.replace('H', ''))
        })
      })
      setToc(tocItems)

      setPageContent(doc.body.innerHTML)
    } catch (err) {
      console.error('Error loading page HTML', err)
      setPageContent('<div class="p-4 text-red-500">Erro ao carregar o conteúdo da página.</div>')
      setToc([])
    }
    setPageLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  const handleContentClick = (e) => {
    const link = e.target.closest('a')
    if (link) {
      // Ignorar interceptação se for um link de download de arquivo ou asset explicitamente
      if (link.classList.contains('is-asset-link') || link.hasAttribute('download')) {
        return
      }

      const href = link.getAttribute('href')
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault()
        const path = href.replace(/^\//, '')
        const page = index?.pages?.find(p => p.path === path)
        if (page) loadPage(page)
      }
    }
  }

  if (!index || !index.pages) {
    return <div className="p-8 text-center text-muted-foreground">Índice da Wiki não encontrado.</div>
  }

  const term = search.toLowerCase()
  const allPages = index.pages.filter(p => 
    p.title.toLowerCase().includes(term) || p.path.toLowerCase().includes(term)
  )

  const grouped = []
  const usedIds = new Set()

  MENU_GROUPS.forEach(groupDef => {
    const groupItems = []
    groupDef.items.forEach(itemDef => {
      // Decode e encode de URI caso haja caracteres especiais nos paths
      const matched = allPages.filter(p => decodeURIComponent(p.path) === decodeURIComponent(itemDef.path) && !usedIds.has(p.id))
      matched.forEach(m => {
        groupItems.push({ ...m, icon: itemDef.icon, displayTitle: itemDef.overrideTitle || m.title })
        usedIds.add(m.id)
      })
    })
    if (groupItems.length > 0) {
      grouped.push({ name: groupDef.name, items: groupItems })
    }
  })

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* 1. Main Navigation Sidebar */}
      <Card className="w-[300px] flex flex-col bg-card border-border/50 rounded-lg overflow-hidden shrink-0 shadow-md">
        <div className="p-4 border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg tracking-tight">Wiki Telemetria</h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-9 h-9 bg-background border-border/50 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-6 custom-scrollbar">
          {grouped.map((group, i) => (
            <div key={i}>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {group.name}
              </h3>
              <div className="space-y-0.5">
                {group.items.map(p => {
                  const isActive = selectedPage?.id === p.id
                  const Icon = p.icon || FileText
                  return (
                    <button
                      key={p.id}
                      onClick={() => loadPage(p)}
                      className={`w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-all text-left ${isActive ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{p.displayTitle}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Main Content Area & Inner TOC */}
      <Card className="flex-1 flex flex-col bg-background border-border/50 rounded-lg overflow-hidden min-w-0 shadow-md">
        {selectedPage && (
          <div className="p-6 border-b border-border/50 bg-card/30 flex justify-between items-center shrink-0">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{selectedPage.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="truncate">Diretório: <span className="font-medium text-foreground/80">
                  {MENU_GROUPS.flatMap(g => g.items).find(i => i.path === selectedPage.path)?.overrideTitle || selectedPage.title}
                </span></span>
                {selectedPage.updatedAt && (
                  <span className="shrink-0">Atualizado: {new Date(selectedPage.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-background relative">
          {pageLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Inner TOC (Compact and integrated just like original wiki) */}
          <div className="w-[260px] hidden xl:flex flex-col shrink-0 border-r border-border/50 bg-card/20 overflow-auto custom-scrollbar">
            <div className="p-6">
              <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-4">Índice</h3>
              {toc.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum índice disponível.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {toc.map((t, i) => (
                    <a 
                      key={i} 
                      href={`#${t.id}`}
                      className="block text-muted-foreground hover:text-foreground transition-colors line-clamp-2"
                      style={{ paddingLeft: `${(t.level - 1) * 12}px` }}
                    >
                      <span className="mr-2 opacity-50 font-bold">›</span>{t.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actual Wiki Page content */}
          <div className="flex-1 overflow-auto p-8 custom-scrollbar">
            <style dangerouslySetInnerHTML={{__html: `
              .wiki-content .toc-anchor { display: none !important; }
              .wiki-content pre { background-color: #000000 !important; border: 1px solid var(--border); border-radius: 6px; }
              .wiki-content code { background-color: rgba(255,255,255,0.05); padding: 0.2em 0.4em; border-radius: 4px; font-weight: normal; border: 1px solid rgba(255,255,255,0.05); }
              .wiki-content pre code { background-color: transparent; padding: 0; border: none; }
              .wiki-content .prose-code::before, .wiki-content .prose-code::after { content: none !important; }
              .wiki-content code::before, .wiki-content code::after { content: none !important; }
              
              .marker-yellow { background-color: #fef08a; color: #854d0e; padding: 0 4px; border-radius: 2px; }
              .marker-green { background-color: #bbf7d0; color: #166534; padding: 0 4px; border-radius: 2px; }
              .marker-pink { background-color: #fbcfe8; color: #9d174d; padding: 0 4px; border-radius: 2px; }
              .marker-blue { background-color: #bfdbfe; color: #1e3a8a; padding: 0 4px; border-radius: 2px; }
              .pen-red { color: #ef4444; font-weight: bold; }
              .pen-green { color: #22c55e; font-weight: bold; }
              
              .wiki-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
              .wiki-content td, .wiki-content th { border: 1px solid var(--border); padding: 12px; }
              .wiki-content tr:nth-child(even) { background-color: rgba(255,255,255,0.02); }
              .wiki-content blockquote { border-left-color: #4CAF50; background: rgba(76, 175, 80, 0.05); padding: 15px 20px; border-radius: 0 4px 4px 0; }
              .wiki-content img, .wiki-content video { max-width: 100%; height: auto; border-radius: 8px; }
              .wiki-content iframe { width: 100%; aspect-ratio: 16/9; max-width: 100%; border-radius: 8px; border: none; margin: 1.5rem 0; background: #000; }
            `}} />

            <div className="w-full">
              <div 
                onClick={handleContentClick}
                className="wiki-content prose prose-invert prose-primary max-w-none 
                  prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-p:text-muted-foreground
                  prose-img:rounded-md prose-img:border prose-img:border-border/50 prose-img:shadow-sm"
                dangerouslySetInnerHTML={{ __html: pageContent }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
