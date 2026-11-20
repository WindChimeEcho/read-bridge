import type { Resource } from '@/types/book'

export function formatCoverDataUrl(cover?: Resource): string | null {
  if (!cover?.data) return null
  return `data:${cover.mediaType || 'image/jpeg'};base64,${cover.data}`
}
