'use client'

import WeatherPage from '@/components/pages/WeatherPage'
import FeatureGate from '@/components/shell/FeatureGate'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { user, features } = useSession()
  return (
    <FeatureGate feature="weather">
      <WeatherPage currentUserRole={user?.role} features={features} />
    </FeatureGate>
  )
}
