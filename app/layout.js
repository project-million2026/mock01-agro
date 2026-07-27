import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Agro Telemetria | Sistema de Monitoramento',
  description: 'Plataforma SaaS para monitoramento de máquinas agrícolas em tempo real',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Tema (claro/escuro) antes da pintura — evita flash. Default escuro; 'light' remove a classe. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark')}else{d.classList.add('dark')}}catch(e){}})()" }} />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossOrigin="" strategy="beforeInteractive" />
        <Script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
