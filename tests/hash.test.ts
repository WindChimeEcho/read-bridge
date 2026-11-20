import { describe, expect, it, vi, afterEach } from 'vitest'
import { sha256FallbackHex, sha256Hex } from '../utils/hash'

const encoder = new TextEncoder()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sha256FallbackHex', () => {
  it.each([
    ['empty input', new Uint8Array()],
    ['ASCII', encoder.encode('abc')],
    ['multibyte UTF-8 and emoji', encoder.encode('caf\u00e9 \u{1f30d}')],
    ['55 bytes', encoder.encode('a'.repeat(55))],
    ['56 bytes', encoder.encode('b'.repeat(56))],
    ['64 bytes', encoder.encode('c'.repeat(64))],
    ['128 bytes', encoder.encode('d'.repeat(128))],
    ['binary', new Uint8Array([0, 255, 17, 128, 10, 233, 0])],
  ] as const)('matches Web Crypto for %s', async (_, bytes) => {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    expect(sha256FallbackHex(bytes)).toBe(Buffer.from(digest).toString('hex'))
  })
})

describe('sha256Hex', () => {
  const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

  it('uses only the bytes inside a view', async () => {
    const bytes = encoder.encode('_abc_').subarray(1, 4)
    await expect(sha256Hex(bytes)).resolves.toBe(expected)
  })

  it('falls back when subtle is unavailable', async () => {
    vi.stubGlobal('crypto', { subtle: undefined })
    await expect(sha256Hex('abc')).resolves.toBe(expected)
  })

  it('falls back when the digest rejects', async () => {
    const digest = vi.fn().mockRejectedValue(new Error('digest unavailable'))
    vi.stubGlobal('crypto', { subtle: { digest } })
    const buffer = new Uint8Array([97, 98, 99]).buffer

    await expect(sha256Hex(buffer)).resolves.toBe(expected)
    expect(digest).toHaveBeenCalledWith('SHA-256', buffer)
  })
})
