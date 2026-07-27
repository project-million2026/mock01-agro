// Fallback padrão enquanto o chunk da rota carrega (o App Router faz code-splitting por rota,
// substituindo os `dynamic(...)` que o page.js monolítico precisava declarar um a um).
export default function Loading() {
  return <p className="p-8 text-muted-foreground animate-pulse">Carregando...</p>
}
