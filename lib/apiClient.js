import mockData from './mockData.json'

export const api = async (path, opts = {}) => {
  console.log(`[MOCK API] ${opts.method || 'GET'} ${path}`)

  // Simulate network delay
  await new Promise(r => setTimeout(r, 500))

  // AUTH
  if (path === '/auth/login') {
    return { token: 'mock-jwt-token', user: { id: 1, name: 'Administrador', email: 'admin@telemetria.com', role: 'admin' } }
  }

  // DASHBOARD
  if (path === '/dashboard/stats') return mockData.stats
  if (path === '/dashboard/positions') return mockData.positions
  if (path === '/dashboard/events-timeline') return mockData.eventsTimeline
  if (path === '/dashboard/recent-events') return mockData.recentEvents

  // SETTINGS (Global timeout)
  if (path.startsWith('/settings/')) {
    if (opts.method === 'PUT') return { success: true }
    // Defaults for GET
    return { key: 'sessionTimeout', value: '30' }
  }

  // CRUD READS
  if (opts.method === 'GET' || !opts.method) {
    if (path === '/users') return { items: mockData.users }
    if (path === '/fleets') return { items: mockData.fleets }
    if (path === '/operators') return { items: mockData.operators }
    if (path === '/farms') return { items: mockData.farms }
    if (path === '/fields') return { items: mockData.fields }
    if (path === '/buildings') return { items: mockData.buildings }
    if (path === '/devices') return { items: mockData.devices }
  }

  // POST / PUT / DELETE (Simulate Success)
  return { success: true }
}
