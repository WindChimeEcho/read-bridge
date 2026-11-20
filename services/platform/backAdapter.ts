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
  return () => {}
}
