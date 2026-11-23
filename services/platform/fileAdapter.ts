import { isDesktopTauri, isIOS, isTauriAndroid } from '@/utils/platform'

export interface PickFileOptions {
  extensions: string[]
  multiple?: boolean
}

export interface SaveFileOptions {
  filename: string
  data: Uint8Array
  mimeType: string
}

export interface FileAdapter {
  pickFiles: (options: PickFileOptions) => Promise<File[]>
  saveBinaryFile: (options: SaveFileOptions) => Promise<{ saved: boolean; location?: string }>
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const BLOB_REVOKE_DELAY_MS = 60_000

let sharedWebFileInput: HTMLInputElement | null = null
let sharedWebFileDoc: Document | null = null
let settlePendingPick: ((files: File[]) => void) | null = null

function buildAcceptString(extensions: string[]): string {
  return extensions
    .map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
    .join(',')
}

function normalizeExtensions(extensions: string[]): string[] {
  return extensions
    .map(ext => ext.replace(/^\./, '').trim().toLowerCase())
    .filter(Boolean)
}

function isImageOnlyExtensions(extensions: string[]): boolean {
  const normalizedExts = normalizeExtensions(extensions)
  return normalizedExts.length > 0 && normalizedExts.every(ext => IMAGE_EXTENSIONS.has(ext))
}

function resolveWebAccept(extensions: string[]): string {
  if (isIOS()) {
    // iOS Files (UIDocumentPickerViewController) maps extensions to strict UTIs and grays out .epub/.md/.rbk.
    return isImageOnlyExtensions(extensions) ? 'image/*' : ''
  }
  return buildAcceptString(extensions)
}

function getSharedWebFileInput(): HTMLInputElement {
  const isAttached =
    sharedWebFileInput !== null &&
    sharedWebFileDoc === document &&
    (typeof document.body?.contains !== 'function' || document.body.contains(sharedWebFileInput))

  if (isAttached && sharedWebFileInput) {
    return sharedWebFileInput
  }

  const input = document.createElement('input')
  input.type = 'file'
  input.tabIndex = -1
  input.setAttribute?.('aria-hidden', 'true')
  // Keep visually hidden without display:none so iOS Safari / standalone PWAs do not block .click() or drop change.
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  input.style.top = '0'
  input.style.width = '1px'
  input.style.height = '1px'
  input.style.opacity = '0'
  input.style.pointerEvents = 'none'

  const mountTarget = document.body ?? document.documentElement
  mountTarget?.appendChild(input)

  sharedWebFileInput = input
  sharedWebFileDoc = document
  return input
}

function basenameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || 'file'
}

function inferMimeTypeFromFilename(filename: string, fallback = 'application/octet-stream'): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'epub':
      return 'application/epub+zip'
    case 'txt':
      return 'text/plain'
    case 'md':
      return 'text/markdown'
    case 'rbk':
    case 'zip':
      return 'application/octet-stream'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    default:
      return fallback
  }
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy.buffer
}

const webFileAdapter: FileAdapter = {
  pickFiles: ({ extensions, multiple = false }) => {
    if (typeof document === 'undefined') {
      return Promise.resolve([])
    }

    // On iOS < 16.4, cancelling the native sheet fires neither `cancel` nor `change`;
    // settle any previous pending pick so a subsequent Import tap starts cleanly.
    if (settlePendingPick) {
      settlePendingPick([])
    }

    return new Promise((resolve) => {
      const input = getSharedWebFileInput()
      input.multiple = multiple

      const accept = resolveWebAccept(extensions)
      if (accept) {
        input.accept = accept
      } else {
        input.accept = ''
        input.removeAttribute?.('accept')
      }

      input.value = ''

      let settled = false
      const cleanup = () => {
        input.removeEventListener('change', handleChange)
        input.removeEventListener('cancel', handleCancel)
        if (settlePendingPick === finalize) {
          settlePendingPick = null
        }
      }

      const finalize = (files: File[]) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(files)
      }

      const handleChange = () => {
        finalize(Array.from(input.files ?? []))
      }

      const handleCancel = () => {
        finalize([])
      }

      input.addEventListener('change', handleChange)
      input.addEventListener('cancel', handleCancel)
      settlePendingPick = finalize

      input.click()
    })
  },

  saveBinaryFile: async ({ filename, data, mimeType }) => {
    if (typeof document === 'undefined') {
      return { saved: false }
    }
    const blob = new Blob([toArrayBuffer(data)], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS)
    return { saved: true, location: filename }
  },
}

const desktopTauriFileAdapter: FileAdapter = {
  pickFiles: async ({ extensions, multiple = false }) => {
    const normalizedExts = normalizeExtensions(extensions)
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')

    const selection = await open({
      multiple,
      filters: normalizedExts.length > 0
        ? [{ name: 'Supported Files', extensions: normalizedExts }]
        : undefined,
    })

    if (!selection) return []
    const paths = Array.isArray(selection) ? selection : [selection]
    const files: File[] = []

    for (const filePath of paths) {
      const bytes = await readFile(filePath)
      const name = basenameFromPath(filePath)
      files.push(
        new File([toArrayBuffer(bytes)], name, {
          type: inferMimeTypeFromFilename(name),
        })
      )
    }

    return files
  },

  saveBinaryFile: async ({ filename, data }) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    const destPath = await save({
      defaultPath: filename,
      filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined,
    })

    if (!destPath) {
      return { saved: false }
    }

    await writeFile(destPath, data)
    return { saved: true, location: destPath }
  },
}

const androidTauriFileAdapter: FileAdapter = {
  pickFiles: async ({ extensions, multiple = false }) => {
    const isImageOnly = isImageOnlyExtensions(extensions)

    const { showOpenFilePicker, getName, getFileMimeType, readFile } = await import(
      'tauri-plugin-android-fs-api'
    )

    const pickedUris = await showOpenFilePicker({
      multiple,
      mimeTypes: isImageOnly ? ['image/*'] : undefined,
      pickerType: isImageOnly ? 'Gallery' : 'FilePicker',
    })

    if (!pickedUris || pickedUris.length === 0) return []
    const files: File[] = []

    for (const uri of pickedUris) {
      const name = await getName(uri)
      const mimeType = await getFileMimeType(uri).catch(() => '')
      const bytes = await readFile(uri)
      files.push(
        new File([toArrayBuffer(bytes)], name || 'file', {
          type: mimeType || inferMimeTypeFromFilename(name || 'file'),
        })
      )
    }

    return files
  },

  saveBinaryFile: async ({ filename, data, mimeType }) => {
    const { showSaveFilePicker, writeFile } = await import('tauri-plugin-android-fs-api')
    const targetUri = await showSaveFilePicker(filename, mimeType || null)
    if (!targetUri) {
      return { saved: false }
    }

    await writeFile(targetUri, data)
    return { saved: true, location: targetUri.uri }
  },
}

export function getFileAdapter(): FileAdapter {
  if (isTauriAndroid()) {
    return androidTauriFileAdapter
  }
  if (isDesktopTauri()) {
    return desktopTauriFileAdapter
  }
  return webFileAdapter
}

export const fileAdapter: FileAdapter = {
  pickFiles: (options) => getFileAdapter().pickFiles(options),
  saveBinaryFile: (options) => getFileAdapter().saveBinaryFile(options),
}
