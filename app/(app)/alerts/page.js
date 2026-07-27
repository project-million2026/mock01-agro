'use client'

import AlertsPage from '@/components/pages/AlertsPage'
import FeatureGate from '@/components/shell/FeatureGate'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { user } = useSession()
  return (
    <FeatureGate feature="alerts">
      <AlertsPage currentUserRole={user?.role} />
    </FeatureGate>
  )
}
