import dayjs from 'dayjs'
import type { CacheKeyParams } from '@/types/cache'

export async function generateCacheKey(params: CacheKeyParams): Promise<string> {
  const input = JSON.stringify({ version: 2, ...params })
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(
    new Uint8Array(digest),
    byte => byte.toString(16).padStart(2, '0')
  ).join('')

  return `v2:${hash}`
}

export function getTimeSlot(): string {
  return dayjs().format('YYYY-MM-DD_HH')
}

export function isTimeExpired(createTime: string, expireHours: number): boolean {
  return dayjs().diff(dayjs(createTime), 'hour') >= expireHours
}

export function parseTimeSlot(slotId: string): Date {
  const [datePart, hourPart] = slotId.split('_')
  return dayjs(`${datePart} ${hourPart}:00:00`).toDate()
}

export function isSlotOlderThan(slotId: string, hours: number): boolean {
  return dayjs().diff(dayjs(parseTimeSlot(slotId)), 'hour') >= hours
}

export function sortSlotsByAge(slotIds: string[]): string[] {
  return [...slotIds].sort((left, right) => (
    parseTimeSlot(left).getTime() - parseTimeSlot(right).getTime()
  ))
}
