/** URL of a file in /public that works from the domain root and from a sub-path (GitHub Pages). */
export const BASE: string = import.meta.env?.BASE_URL ?? '/'
export const asset = (path: string) => BASE + path.replace(/^\//, '')
