// Usage: useDebouncedWatch(source, () => { /* do search */ }, 300)
import { watch } from 'vue'

export function useDebouncedWatch(source, cb, delay = 300, options = {}) {
  let t
  return watch(
    source,
    (...args) => {
      clearTimeout(t)
      t = setTimeout(() => cb(...args), delay)
    },
    options
  )
}
