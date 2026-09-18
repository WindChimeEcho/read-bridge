import { useCacheStore } from '@/store/useCacheStore'
import { CacheKeyParams, CacheItem, CacheItemValue } from '@/types/cache'
import { generateCacheKey, getTimeSlot, isSlotOlderThan, isTimeExpired, sortSlotsByAge } from '@/utils/cache'
import { DEFAULT_CACHE_SETTINGS, SETTING_BOUNDS } from '@/constants/cache'
import dayjs from 'dayjs'

export function CacheService() {
  /**
   * 获取缓存项
   */
  async function get(params: CacheKeyParams): Promise<CacheItem | null> {
    const store = useCacheStore.getState()

    const cacheKey = await generateCacheKey(params)

    const timeSlot = store.getSlotForKey(cacheKey)
    // 无时间槽
    if (!timeSlot) return null

    const item = store.getItem(timeSlot, cacheKey)
    // 无对应值
    if (!item) return null

    const { expireHours } = store.getSettings()
    if (isTimeExpired(item.createTime, expireHours)) {
      // 过期清理
      store.removeItem(timeSlot, cacheKey)
      store.updateIndex(cacheKey, null)
      return null
    }

    if (item.schemaVersion !== 2) return null
    return item
  }

  /** 保存完成并通过校验的 v2 结果。 */
  async function set(params: CacheKeyParams, values: CacheItemValue): Promise<void> {
    const store = useCacheStore.getState()

    const cacheKey = await generateCacheKey(params)
    const timeSlot = getTimeSlot()

    // 清除老数据
    await remove(params)

    // 创建缓存项
    const cacheItem: CacheItem = {
      createTime: dayjs().toISOString(),
      ...values
    }

    // 存储新数据
    store.setItem(timeSlot, cacheKey, cacheItem)
    store.updateIndex(cacheKey, timeSlot)
  }

  /**
   * 移除缓存项
   */
  async function remove(params: CacheKeyParams): Promise<void> {
    const store = useCacheStore.getState()

    const cacheKey = await generateCacheKey(params)
    const timeSlot = store.getSlotForKey(cacheKey)
    // 有对应时间槽
    if (timeSlot) {
      store.removeItem(timeSlot, cacheKey)
      store.updateIndex(cacheKey, null)
    }
  }

  /**
   * 更新单个缓存设置项
   */
  async function updateSetting(key: keyof typeof DEFAULT_CACHE_SETTINGS, value: number): Promise<void> {
    const store = useCacheStore.getState()

    // 正整数检查
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${key} 必须是正整数`);
    }

    // 边界检查
    const bounds = SETTING_BOUNDS[key];
    if (value < bounds.min || value > bounds.max) {
      throw new Error(`${key} 值必须在 ${bounds.min} 到 ${bounds.max} 之间`);
    }

    store.updateSettings({ [key]: value })
  }

  /**
   * 清理
   */
  async function clearCacheOnTriggerEvents() {
    let store = useCacheStore.getState()
    // 获取当前时间
    const now = dayjs()
    const timeSlot = getTimeSlot()
    const protectTimeSlots = [timeSlot]

    const { bufferSlots, maxCacheSize, expireHours } = store.getSettings()
    // 效率优先 
    // 检查槽位是否过期
    Array.from({ length: bufferSlots }).forEach((_, index) => {
      const prevSlot = now.subtract(index + 1, 'hour').format('YYYY-MM-DD_HH')
      protectTimeSlots.push(prevSlot)
    })
    const slotsToBeChecked = store.getAllSlots().filter(slot => {
      return !protectTimeSlots.includes(slot)
    })
    slotsToBeChecked.forEach(slot => {
      if (isSlotOlderThan(slot, expireHours)) {
        store.removeSlot(slot)
        store.removeIndex(slot)
      }
    })
    store = useCacheStore.getState()
    // 判断是否超量
    const length = store.getTotalCount()
    // 如果不超量 直接退出
    if (maxCacheSize >= length) return
    // 如果超量 需要清理

    // 计算清理目标
    const needToRemove = length - maxCacheSize

    // 获取时间槽排序
    const allSlots = store.getAllSlots()
    const sortedSlots = sortSlotsByAge(allSlots)

    // 混合清理
    let removedCount = 0

    for (const slot of sortedSlots) {
      const slotData = store.getSlot(slot)
      if (!slotData) continue

      const slotItemCount = Object.keys(slotData).length
      const remainingToRemove = needToRemove - removedCount

      if (slotItemCount <= remainingToRemove) {
        // 情况A：整槽清理 - 槽内项目数 ≤ 需要清理数
        store.removeSlot(slot)
        store.removeIndex(slot)
        removedCount += slotItemCount
      } else {
        // 情况B：槽内精细清理 - 槽内项目数 > 需要清理数
        const itemsWithTime = Object.entries(slotData)
          .map(([key, item]) => ({ key, item, createTime: item.createTime }))
          .sort((a, b) => a.createTime.localeCompare(b.createTime))

        // 删除最老的项目
        for (let i = 0; i < remainingToRemove; i++) {
          const { key } = itemsWithTime[i]
          store.removeItem(slot, key)
          store.updateIndex(key, null)
        }
        removedCount += remainingToRemove
        break // 精细清理后必然满足要求，退出循环
      }

      if (removedCount >= needToRemove) break
    }
  }

  return {
    get,
    set,
    remove,
    updateSetting,
    clearCacheOnTriggerEvents
  }
}

// 导出单例
export const cacheService = CacheService()

