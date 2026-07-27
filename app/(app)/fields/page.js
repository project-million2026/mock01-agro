'use client'

import FieldsPage from '@/components/pages/FieldsPage'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { features } = useSession()
  return <FieldsPage features={features} />
}
