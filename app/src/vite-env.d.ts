export {}

declare global {
  interface Window {
    clinic: {
      invoke: (channel: string, ...args: unknown[]) => Promise<any>
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}
