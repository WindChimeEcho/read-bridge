import { afterEach, describe, expect, it, vi } from 'vitest'
import { initBackButtonListener } from '../services/platform/backAdapter'
import { getFileAdapter } from '../services/platform/fileAdapter'
import { getSystemTTSDriver } from '../services/platform/ttsAdapter'
import { isDesktopTauri, isTauri, isTauriAndroid } from '../utils/platform'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('platform adapters safe fallback outside Tauri', () => {
  it('detects non-Tauri runtime cleanly in Node', () => {
    expect(isTauri()).toBe(false)
    expect(isDesktopTauri()).toBe(false)
    expect(isTauriAndroid()).toBe(false)
  })

  it('returns a no-op cleanup from initBackButtonListener outside Tauri Android', async () => {
    const cleanup = await initBackButtonListener()
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })

  it('selects web fileAdapter and degrades gracefully without DOM', async () => {
    const adapter = getFileAdapter()
    const picked = await adapter.pickFiles({ extensions: ['epub'] })
    const saved = await adapter.saveBinaryFile({
      filename: 'test.rbk',
      data: new Uint8Array([1, 2, 3]),
      mimeType: 'application/octet-stream',
    })
    expect(picked).toEqual([])
    expect(saved).toEqual({ saved: false })
  })

  it('selects web TTS driver outside Tauri Android without throwing in Node', async () => {
    const driver = getSystemTTSDriver()
    expect(driver.getStatus()).toEqual({ isSpeaking: false, isPaused: false })
    await expect(driver.getVoices()).resolves.toEqual([])
    await expect(driver.isAvailable()).resolves.toBe(false)
  })
})
