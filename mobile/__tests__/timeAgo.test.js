import { timeAgo } from '../src/ui/AlertCard'

// Tempo relativo curto (pt-BR) exibido nos alertas da Home. Pura, sem rede — trava a lógica de
// faixas ("agora"/"há N min"/"ontem") e o tratamento de entrada inválida.
describe('timeAgo', () => {
  const agoISO = (ms) => new Date(Date.now() - ms).toISOString()
  const MIN = 60 * 1000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  it('menos de 1 min → "agora"', () => {
    expect(timeAgo(agoISO(10 * 1000))).toBe('agora')
  })
  it('minutos', () => {
    expect(timeAgo(agoISO(6 * MIN))).toBe('há 6 min')
  })
  it('horas', () => {
    expect(timeAgo(agoISO(3 * HOUR))).toBe('há 3 h')
  })
  it('1 dia → "ontem"', () => {
    expect(timeAgo(agoISO(DAY + HOUR))).toBe('ontem')
  })
  it('vários dias', () => {
    expect(timeAgo(agoISO(4 * DAY))).toBe('há 4 dias')
  })
  it('entrada nula/ inválida → string vazia (não quebra o card)', () => {
    expect(timeAgo(null)).toBe('')
    expect(timeAgo('não-é-data')).toBe('')
  })
})
