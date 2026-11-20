import { isTauriAndroid } from '@/utils/platform'

export type BackHandler = () => boolean

interface RegisteredHandler {
  id: number
  priority: number
  handler: BackHandler
}

let nextId = 1
const handlers: RegisteredHandler[] = []

export function registerBackHandler(priority: number, handler: BackHandler): () => void {
  const entry: RegisteredHandler = {
    id: nextId++,
    priority,
    handler,
  }
  handlers.push(entry)

  return () => {
    const index = handlers.findIndex(item => item.id === entry.id)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }
}

export function dispatchBackEvent(): boolean {
  const ordered = [...handlers].sort((a, b) => (
    b.priority !== a.priority ? b.priority - a.priority : b.id - a.id
  ))

  for (const entry of ordered) {
    if (entry.handler()) {
      return true
    }
  }

  return false
}

export function clearBackHandlersForTest(): void {
  handlers.length = 0
}

export async function initBackButtonListener(): Promise<() => void> {
  if (!isTauriAndroid()) {
    return () => {}
  }

  try {
    const { onBackButtonPress, exit } = await import('@tauri-apps/api/app')
    const listener = await onBackButtonPress(() => {
      const handled = dispatchBackEvent()
      if (!handled) {
        void exit(0)
      }
    })
    return () => {
      void listener.unregister()
    }
  } catch (error) {
    console.error('Failed to initialize Android back button listener:', error)
    return () => {}
  }
}
