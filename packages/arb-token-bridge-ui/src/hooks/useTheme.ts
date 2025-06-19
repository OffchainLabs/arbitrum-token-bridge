import { useEffect } from 'react'
import { useArbQueryParams, ThemeConfig } from './useArbQueryParams'

// Map theme properties to CSS variables
const themeVariableMap: Record<keyof ThemeConfig, string> = {
  borderRadius: '--border-radius'
  // Add more mappings as we extend the theme
  // colors: '--color',
  // spacing: '--spacing',
}

export function useTheme() {
  const [{ theme }] = useArbQueryParams()

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
  }, [theme])
}
