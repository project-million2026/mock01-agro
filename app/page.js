import { redirect } from 'next/navigation'

// A raiz não tem tela própria: o app começa no painel. (Antes este arquivo era o app inteiro —
// 400 linhas trocando 15 telas por estado; hoje cada tela é uma rota em `app/(app)/`.)
export default function Home() {
  redirect('/dashboard')
}
