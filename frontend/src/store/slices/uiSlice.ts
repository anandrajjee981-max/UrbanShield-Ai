import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'urbanshield_theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* ignore */
  }
  return 'light';
}

interface UiState { sidebarOpen: boolean; mobileMenuOpen: boolean; theme: Theme; globalSearch: string; }
const initialState: UiState = { sidebarOpen: true, mobileMenuOpen: false, theme: initialTheme(), globalSearch: '' };

const slice = createSlice({
  name: 'ui', initialState,
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen; },
    toggleMobileMenu: (s) => { s.mobileMenuOpen = !s.mobileMenuOpen; },
    closeMobileMenu: (s) => { s.mobileMenuOpen = false; },
    setSidebar: (s, a: PayloadAction<boolean>) => { s.sidebarOpen = a.payload; },
    toggleTheme: (s) => {
      s.theme = s.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, s.theme); } catch { /* ignore */ }
    },
    /** Topbar global search — filters incidents, citizen reports and authority tasks. */
    setGlobalSearch: (s, a: PayloadAction<string>) => { s.globalSearch = a.payload; },
  },
});
export const { toggleSidebar, toggleMobileMenu, closeMobileMenu, setSidebar, toggleTheme, setGlobalSearch } = slice.actions;
export default slice.reducer;
