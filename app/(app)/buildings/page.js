'use client'

import BuildingsPage from '@/components/pages/BuildingsPage'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { features } = useSession()
  return <BuildingsPage features={features} />
}
