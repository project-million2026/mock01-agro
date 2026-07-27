'use client'

import SessionSettings from '@/components/SessionSettings'
import UsuariosPage from '@/components/pages/UsuariosPage'
import { useSession } from '@/components/shell/SessionContext'

export default function Page() {
  const { user } = useSession()
  return (
    <div className="space-y-6">
      {user?.role === 'admin' && <SessionSettings />}
      <UsuariosPage currentUserRole={user?.role} />
    </div>
  )
}
