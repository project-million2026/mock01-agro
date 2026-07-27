'use client'

import ReportsPage from '@/components/pages/ReportsPage'
import FeatureGate from '@/components/shell/FeatureGate'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { features } = useSession()
  return (
    <FeatureGate feature="reports">
      <ReportsPage features={features} />
    </FeatureGate>
  )
}
