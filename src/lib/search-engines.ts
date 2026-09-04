export type SearchEngineId = 'google' | 'baidu' | 'bing' | 'duckduckgo' | 'github'

export interface SearchEngineConfig {
  id: SearchEngineId
  name: string
  urlTemplate: string
}

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngineConfig> = {
  google: {
    id: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q=',
  },
  baidu: {
    id: 'baidu',
    name: '百度',
    urlTemplate: 'https://www.baidu.com/s?wd=',
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q=',
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    urlTemplate: 'https://duckduckgo.com/?q=',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q=',
  },
}

export const DEFAULT_SEARCH_ENGINE_ID: SearchEngineId = 'google'

export function isUrl(input: string): boolean {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return true
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) return true
  return /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(trimmed)
}

export function resolveSearchOrUrl(
  input: string,
  engineId: SearchEngineId = DEFAULT_SEARCH_ENGINE_ID,
): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  if (isUrl(trimmed)) {
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    if (/^localhost/i.test(trimmed)) {
      return `http://${trimmed}`
    }
    return `https://${trimmed}`
  }

  const engine = SEARCH_ENGINES[engineId] ?? SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE_ID]
  return `${engine.urlTemplate}${encodeURIComponent(trimmed)}`
}
