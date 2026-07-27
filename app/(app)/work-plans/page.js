'use client'

import WorkPlansPage from '@/components/pages/WorkPlansPage'
import FeatureGate from '@/components/shell/FeatureGate'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { user } = useSession()
  return (
    <FeatureGate feature="oficina">
      <WorkPlansPage currentUserRole={user?.role} />
    </FeatureGate>
  )
}
