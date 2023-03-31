import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useArbQueryParams } from './useArbQueryParams'

const classicThemeKey = 'arbitrum-classic-theme'

// getter and setter for the app theme
export const useTheme = () => {
  const defaultTheme = useDefaultTheme()
  const [{ theme }, setQueryParams] = useArbQueryParams()
  const isClassicTheme = theme === classicThemeKey

  useEffect(() => {
    // on the first load, set theme as the default one
    setTheme(defaultTheme)
  }, [defaultTheme])

  const setTheme = (theme: string) => {
    // set theme in query params
    setTimeout(() => {
      // settimeout reqd otherwise theme not set initially in query params
      setQueryParams({ theme })
    }, 0)

    // set the theme in body
    const elem = document.getElementById('body-theme')
    if (!elem) return
    elem.className = theme
  }

  return {
    classicThemeKey,
    theme,
    setTheme,
    isClassicTheme
  }
}

// a static hook (can be used outside the scope of provider) which checks which default theme to apply
// our default theme is set on <body> in _document component where we do not have access to useArbQueryParams
export const useDefaultTheme = () => {
  const is1April = dayjs().isSame('2023-04-01', 'day')

  const [defaultTheme, setDefaultTheme] = useState<typeof classicThemeKey | ''>(
    is1April ? classicThemeKey : '' // initially only check for 1 April
  )

  useEffect(() => {
    // window object is accessible in the useEffect hook in _document, not otherwise
    const isThemeInQueryParams =
      window.location.search.indexOf(classicThemeKey) > -1

    // if april 1 or theme is in query params, then show classic theme by default
    setDefaultTheme(isThemeInQueryParams || is1April ? classicThemeKey : '')
  }, [])

  return defaultTheme
}
