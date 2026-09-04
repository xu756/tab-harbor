import { useStore } from '@tanstack/react-store'
import { Store } from '@tanstack/store'

export type ThemeMode = 'system' | 'light' | 'dark'

interface UiState {
  tabSearch: string
  selectedTabIds: number[]
  commandOpen: boolean
  settingsOpen: boolean
  theme: ThemeMode
}

function initialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const value = window.localStorage.getItem('harbor.theme') ?? window.localStorage.getItem('tabHarbor.theme')
  return value === 'light' || value === 'dark' ? value : 'system'
}

export const uiStore = new Store<UiState>({
  tabSearch: '',
  selectedTabIds: [],
  commandOpen: false,
  settingsOpen: false,
  theme: initialTheme(),
})


export function useUiStore<T>(selector: (state: UiState) => T) {
  return useStore(uiStore, selector)
}

export function setTabSearch(tabSearch: string) {
  uiStore.setState((state) => ({ ...state, tabSearch }))
}

export function setSelectedTabIds(selectedTabIds: number[]) {
  uiStore.setState((state) => ({ ...state, selectedTabIds }))
}

export function toggleTabSelection(tabId: number) {
  uiStore.setState((state) => ({
    ...state,
    selectedTabIds: state.selectedTabIds.includes(tabId)
      ? state.selectedTabIds.filter((id) => id !== tabId)
      : [...state.selectedTabIds, tabId],
  }))
}

export function setCommandOpen(commandOpen: boolean) {
  uiStore.setState((state) => ({ ...state, commandOpen }))
}

export function setSettingsOpen(settingsOpen: boolean) {
  uiStore.setState((state) => ({ ...state, settingsOpen }))
}


export function cycleTheme() {
  uiStore.setState((state) => {
    const theme: ThemeMode = state.theme === 'system' ? 'light' : state.theme === 'light' ? 'dark' : 'system'
    if (typeof window !== 'undefined') window.localStorage.setItem('harbor.theme', theme)
    return { ...state, theme }
  })
}
