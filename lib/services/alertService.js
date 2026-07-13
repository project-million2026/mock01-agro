import { alertRepository } from '@/lib/repositories/alertRepository'
import { cleanArr } from '@/lib/http/response'

export const alertService = {
  async list({ limit = 50, onlyUnread = false }) {
    const cappedLimit = Math.min(limit, 200)
    const filter = onlyUnread ? { read: false } : {}
    const [items, unread] = await Promise.all([
      alertRepository.findList(filter, cappedLimit),
      alertRepository.countUnread(),
    ])
    return { items: cleanArr(items), unread }
  },

  async markRead(ids) {
    await alertRepository.markRead(ids)
    return { updated: true }
  },
}
