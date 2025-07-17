import { useEffect } from 'react'
import { useArbQueryParams } from './useArbQueryParams'

// Theme configuration types
export interface ThemeConfig {
  borderRadius?: string
  widgetBackgroundColor?: string
  borderWidth?: string
}

export const defaultTheme: ThemeConfig = {
  borderRadius: '5px',
  borderWidth: '1px',
  widgetBackgroundColor: '#191919'
}

// Map theme properties to CSS variables
const themeVariableMap: Record<keyof ThemeConfig, string> = {
  borderRadius: '--border-radius',
  borderWidth: '--border-width',
  widgetBackgroundColor: '--color-widget-background'
}

export function useTheme() {
  const [{ theme }] = useArbQueryParams()

  const _themeKey = theme?.toString() // we don't want the hook to fire every time the object reference changes

  useEffect(() => {
    // Apply all theme properties to CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      const cssVariable = themeVariableMap[key as keyof ThemeConfig]
      if (cssVariable && value) {
        document.documentElement.style.setProperty(
          cssVariable,
          value.toString()
        )
      }
    })

    return () => {
      // Clean up all theme variables
      Object.values(themeVariableMap).forEach(cssVariable => {
        document.documentElement.style.removeProperty(cssVariable)
      })
    }
  }, [_themeKey])
}
