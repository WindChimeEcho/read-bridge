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

function buildAcceptString(extensions: string[]): string {
  return extensions
    .map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
    .join(',')
}

const webFileAdapter: FileAdapter = {
  pickFiles: ({ extensions, multiple = false }) => {
    if (typeof document === 'undefined') {
      return Promise.resolve([])
    }

    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = multiple
      const accept = buildAcceptString(extensions)
      if (accept) input.accept = accept

      let settled = false
      const finalize = (files: File[]) => {
        if (settled) return
        settled = true
        window.removeEventListener('focus', handleFocus)
        input.remove()
        resolve(files)
      }

      const handleFocus = () => {
        setTimeout(() => {
          finalize(Array.from(input.files ?? []))
        }, 300)
      }

      input.addEventListener('change', () => {
        finalize(Array.from(input.files ?? []))
      })
      input.addEventListener('cancel', () => finalize([]))
      window.addEventListener('focus', handleFocus)

      input.style.display = 'none'
      document.body.appendChild(input)
      input.click()
    })
  },

  saveBinaryFile: async ({ filename, data, mimeType }) => {
    if (typeof document === 'undefined') {
      return { saved: false }
    }
    const copy = new Uint8Array(data.byteLength)
    copy.set(data)
    const blob = new Blob([copy.buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return { saved: true, location: filename }
  },
}

export function getFileAdapter(): FileAdapter {
  return webFileAdapter
}

export const fileAdapter: FileAdapter = {
  pickFiles: (options) => getFileAdapter().pickFiles(options),
  saveBinaryFile: (options) => getFileAdapter().saveBinaryFile(options),
}
