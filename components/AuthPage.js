'use client'

import { useState } from 'react'
import { Tractor, Lock, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'

export default function AuthPage({ onAuth }) {
  const [email, setEmail] = useState('admin@telemetria.com')
  const [password, setPassword] = useState('admin')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Preencha os dados')
    setLoading(true)
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      onAuth(res.token, res.user)
      toast.success('Bem-vindo!')
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <Card className="w-full max-w-md relative z-10 glow-card border-border/50">
        <CardHeader className="space-y-3 pb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/20">
            <Tractor className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Agro Telemetria</CardTitle>
          <CardDescription>Faça login para acessar o painel de monitoramento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@telemetria.com"
                  className="pl-9 bg-black/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9 bg-black/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? 'Acessando...' : 'Entrar no Sistema'}
            </Button>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md text-sm text-center text-primary/80">
              <p><strong>OBS:</strong> Para testar, utilize o botão "Entrar no Sistema".<br/>Login: <em>admin@telemetria.com</em> | Senha: <em>admin</em></p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
