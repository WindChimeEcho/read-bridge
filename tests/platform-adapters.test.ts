import { afterEach, describe, expect, it, vi } from 'vitest'
import { initBackButtonListener } from '../services/platform/backAdapter'
import { getFileAdapter } from '../services/platform/fileAdapter'
import { getSystemTTSDriver } from '../services/platform/ttsAdapter'
import { isDesktopTauri, isIOS, isTauri, isTauriAndroid } from '../utils/platform'

type Listener = () => void

class MockEventTarget {
  private listeners = new Map<string, Set<Listener>>()

  addEventListener(type: string, listener: Listener) {
    let set = this.listeners.get(type)
    if (!set) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(listener)
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event: { type: string }) {
    const set = this.listeners.get(event.type)
    if (!set) return true
    for (const listener of Array.from(set)) {
      listener()
    }
    return true
  }
}

interface MockInputElement extends MockEventTarget {
  type: string
  multiple: boolean
  tabIndex: number
  files: File[] | null
  style: Record<string, string>
  clickCount: number
  accept: string
  value: string
  setAttribute: (name: string, val: string) => void
  removeAttribute: (name: string) => void
  hasAttribute: (name: string) => boolean
  click: () => void
  remove: () => void
}

function createMockInput(onRemove: (el: MockInputElement) => void): MockInputElement {
  const target = new MockEventTarget()
  const attributes = new Map<string, string>()
  let internalValue = ''
  let internalFiles: File[] | null = null

  const input: MockInputElement = Object.assign(target, {
    type: '',
    multiple: false,
    tabIndex: 0,
    style: {} as Record<string, string>,
    clickCount: 0,
    get files() {
      return internalFiles
    },
    set files(next: File[] | null) {
      internalFiles = next
    },
    get accept() {
      return attributes.get('accept') ?? ''
    },
    set accept(val: string) {
      if (val) {
        attributes.set('accept', val)
      } else {
        attributes.delete('accept')
      }
    },
    get value() {
      return internalValue
    },
    set value(val: string) {
      internalValue = val
      if (val === '') {
        internalFiles = null
      }
    },
    setAttribute(name: string, val: string) {
      attributes.set(name, val)
    },
    removeAttribute(name: string) {
      attributes.delete(name)
    },
    hasAttribute(name: string) {
      return attributes.has(name)
    },
    click() {
      input.clickCount += 1
    },
    remove() {
      onRemove(input)
    },
  })

  return input
}

function createMockDom() {
  const mockWindow = new MockEventTarget()
  const createdInputs: MockInputElement[] = []
  const attachedNodes = new Set<MockInputElement>()

  const body = {
    appendChild(node: MockInputElement) {
      attachedNodes.add(node)
      return node
    },
    contains(node: MockInputElement) {
      return attachedNodes.has(node)
    },
  }

  const mockDocument = {
    body,
    documentElement: body,
    createElement(tag: string) {
      if (tag !== 'input') {
        throw new Error(`Unexpected tag: ${tag}`)
      }
      const input = createMockInput(el => attachedNodes.delete(el))
      createdInputs.push(input)
      return input
    },
  }

  vi.stubGlobal('window', mockWindow)
  vi.stubGlobal('document', mockDocument)

  return { mockWindow, mockDocument, createdInputs, attachedNodes }
}

afterEach(() => {
  vi.useRealTimers()
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

describe('iOS platform detection and web file picker behavior', () => {
  it('detects iPhone, iPad, and iPadOS desktop-mode user agents accurately', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(true)

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPad',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(true)

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(true)

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    })
    expect(isIOS()).toBe(false)

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(false)
  })

  it('delivers selected files when change fires after window focus on iOS', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    const { mockWindow, createdInputs, attachedNodes } = createMockDom()
    const adapter = getFileAdapter()

    const pickPromise = adapter.pickFiles({ extensions: ['epub', 'txt', 'md'], multiple: true })
    expect(createdInputs).toHaveLength(1)
    const input = createdInputs[0]
    expect(input.clickCount).toBe(1)

    await vi.advanceTimersByTimeAsync(50)
    mockWindow.dispatchEvent({ type: 'focus' })
    await vi.advanceTimersByTimeAsync(400)

    const epubFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'sample.epub', { type: '' })
    input.files = [epubFile]
    await vi.advanceTimersByTimeAsync(150)
    input.dispatchEvent({ type: 'change' })

    await expect(pickPromise).resolves.toEqual([epubFile])
    expect(attachedNodes.has(input)).toBe(true)
  })

  it('omits accept for document imports on iOS/iPadOS, keeps image/* for images, and avoids display:none', async () => {
    const { createdInputs } = createMockDom()
    const adapter = getFileAdapter()

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    const bookPick = adapter.pickFiles({ extensions: ['epub', 'txt', 'md'], multiple: true })
    const input = createdInputs[0]
    expect(input.accept).toBe('')
    expect(input.hasAttribute('accept')).toBe(false)
    expect(input.style.display).not.toBe('none')
    expect(input.style.position).toBe('fixed')
    expect(input.style.opacity).toBe('0')
    input.dispatchEvent({ type: 'cancel' })
    await expect(bookPick).resolves.toEqual([])

    const backupPick = adapter.pickFiles({ extensions: ['rbk', 'zip'], multiple: false })
    expect(input.hasAttribute('accept')).toBe(false)
    input.dispatchEvent({ type: 'cancel' })
    await expect(backupPick).resolves.toEqual([])

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })
    const ipadBookPick = adapter.pickFiles({ extensions: ['epub', 'txt', 'md'], multiple: true })
    expect(input.hasAttribute('accept')).toBe(false)
    input.dispatchEvent({ type: 'cancel' })
    await expect(ipadBookPick).resolves.toEqual([])

    const imagePick = adapter.pickFiles({ extensions: ['png', 'jpg', 'jpeg', 'webp'], multiple: false })
    expect(input.accept).toBe('image/*')
    input.dispatchEvent({ type: 'cancel' })
    await expect(imagePick).resolves.toEqual([])

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
    })
    const desktopWebPick = adapter.pickFiles({ extensions: ['epub', 'txt', 'md'], multiple: true })
    expect(input.accept).toBe('.epub,.txt,.md')
    input.dispatchEvent({ type: 'cancel' })
    await expect(desktopWebPick).resolves.toEqual([])
  })

  it('settles a prior pending pick when re-triggered after an unreported cancel', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    const { createdInputs } = createMockDom()
    const adapter = getFileAdapter()

    const firstPick = adapter.pickFiles({ extensions: ['epub', 'txt', 'md'], multiple: true })
    const secondPick = adapter.pickFiles({ extensions: ['epub', 'txt', 'md'], multiple: true })

    await expect(firstPick).resolves.toEqual([])
    expect(createdInputs).toHaveLength(1)
    const input = createdInputs[0]
    const nextFile = new File(['hello'], 'book.txt', { type: 'text/plain' })
    input.files = [nextFile]
    input.dispatchEvent({ type: 'change' })
    await expect(secondPick).resolves.toEqual([nextFile])
  })
})
