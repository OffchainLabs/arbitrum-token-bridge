import useSWRImmutable from 'swr/immutable'
import { useArbQueryParams } from './useArbQueryParams'
import { unica } from '../components/common/Font'

// Theme configuration types
export interface ThemeConfig {
  borderRadius?: string
  widgetBackgroundColor?: string
  borderWidth?: string
  networkThemeOverrideColor?: string
  primaryCtaColor?: string
  fontFamily?: string
}

export const defaultTheme: ThemeConfig = {
  borderRadius: '10px',
  borderWidth: '1px',
  widgetBackgroundColor: '#191919',
  fontFamily: `${unica.style.fontFamily}, Roboto, sans-serif`
}

// Map theme properties to CSS variables
const themeVariableMap: Record<keyof ThemeConfig, string> = {
  borderRadius: '--border-radius',
  borderWidth: '--border-width',
  widgetBackgroundColor: '--color-widget-background',
  networkThemeOverrideColor: '--color-network-theme-override',
  primaryCtaColor: '--color-primary-cta',
  fontFamily: '--font-family'
}

function applyThemeToCSS(theme: ThemeConfig): void {
  // Clean up previous theme variables first
  Object.values(themeVariableMap).forEach(cssVariable => {
    document.documentElement.style.removeProperty(cssVariable)
  })

  // Apply new theme properties to CSS variables
  Object.entries(theme).forEach(([key, value]) => {
    const cssVariable = themeVariableMap[key as keyof ThemeConfig]
    if (cssVariable && value) {
      document.documentElement.style.setProperty(cssVariable, value.toString())
    }
  })
}

export function useTheme() {
  const [{ theme }] = useArbQueryParams()

  useSWRImmutable([theme, 'useTheme'], ([theme]) => {
    applyThemeToCSS(theme)
    return null
  })
}
