import { useEffect } from 'react'

import { useArbQueryParams } from './useArbQueryParams'

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
