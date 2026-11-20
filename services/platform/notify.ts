export interface NotifyAdapter {
  success: (content: string) => void
  error: (content: string) => void
  warning: (content: string) => void
  info: (content: string) => void
}

const fallbackAdapter: NotifyAdapter = {
  success: () => {},
  error: (content) => console.error(content),
  warning: (content) => console.warn(content),
  info: () => {},
}

let activeAdapter: NotifyAdapter = fallbackAdapter

export function setNotifyAdapter(adapter: NotifyAdapter): void {
  activeAdapter = adapter
}

export function resetNotifyAdapter(): void {
  activeAdapter = fallbackAdapter
}

export const notify: NotifyAdapter = {
  success: (content) => activeAdapter.success(content),
  error: (content) => activeAdapter.error(content),
  warning: (content) => activeAdapter.warning(content),
  info: (content) => activeAdapter.info(content),
}
