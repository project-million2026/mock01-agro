'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/shell/SessionContext'

/**
 * Gate de módulo por plano em acesso DIRETO pela URL (o menu já esconde o que não está incluído).
 * Não redireciona: com as flags carregando de forma assíncrona, um redirect vira corrida/loop —
 * e dizer o motivo é mais honesto do que jogar o usuário para outra tela sem explicação.
 * Assim como o AuthGate, isto é apresentação; o gate real é o backend (`require_feature` → 403).
 */
export default function FeatureGate({ feature, children }) {
  const { hasFeature } = useSession()
  if (hasFeature(feature)) return children

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Módulo não incluído no seu plano</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Este módulo existe, mas não faz parte do plano contratado por esta organização.
        Fale com o responsável pela conta para habilitá-lo.
      </p>
      <Button asChild variant="outline" className="mt-2"><Link href="/dashboard">Voltar ao painel</Link></Button>
    </div>
  )
}
