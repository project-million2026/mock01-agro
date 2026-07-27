// Design tokens do app. Um único ponto de verdade para cor, espaço, raio e alvo de toque —
// os primitivos de src/ui/ consomem daqui para manter a grade 8pt e os mínimos de acessibilidade.

// Paleta escura alinhada ao web (verde agro sobre fundo escuro).
export const theme = {
  bg: '#0b1120',
  card: '#131c2e',
  card2: '#182338',
  border: '#243049',
  text: '#e6edf7',
  muted: '#8b97a8',
  primary: '#22c55e',
  primaryInk: '#04120a',   // texto sobre o verde (contraste AA)
  danger: '#f43f5e',
  warning: '#f59e0b',
}

// Grade de 8pt: todo espaçamento (padding/margin/gap) sai daqui — nada de números soltos.
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 }

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 }

// Mínimos de alvo de toque (HIG 44 / Material 48). MIN_TARGET é o piso usado nos primitivos
// pressáveis para não punir o toque (WCAG 2.5.8 / políticas das lojas).
export const MIN_TARGET = 48

export const font = {
  display: 28,
  title: 22,
  section: 11,   // rótulos de seção (maiúsculas, com tracking)
  body: 14,
  small: 12,
}
