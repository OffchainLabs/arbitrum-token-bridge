import { useEffect } from 'react'
import { useArbQueryParams } from './useArbQueryParams'

export const classicThemeKey = 'arbitrum-classic-theme'

export const THEME_CONFIG = [
  {
    id: 'space',
    label: 'Space',
    queryParam: '',
    description:
      'A dark, space-themed UI with a sleek and futuristic aesthetic, featuring Arbinaut on a backdrop of shining stars and moon.'
  },
  {
    id: classicThemeKey,
    label: 'Arbitrum Classic',
    queryParam: classicThemeKey,
    description:
      'Arbitrum before it was cool: A reminiscent of the pre-nitro era, with simple, solid buttons, a minimal purple layout and chunky fonts.'
  }
]

export const useTheme = () => {
  const [{ theme }, setQueryParams] = useArbQueryParams()

  const setTheme = (_theme: string) => {
    setQueryParams({ theme: _theme })
  }

  useEffect(() => {
    document.body.className = theme
  }, [theme])

  return [theme, setTheme] as const
}
