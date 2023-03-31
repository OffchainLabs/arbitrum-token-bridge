import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useTheme } from 'src/hooks/useTheme'

const aprilFools = '2023-04-01'
export const isAprilFools = dayjs().isSame(aprilFools, 'day')
export const isAfterAprilFools = dayjs().isAfter(aprilFools, 'day')
export const classicThemeKey = 'arbitrum-classic-theme'

export const ThemeIncluder = () => {
  const [, setTheme] = useTheme()
  const [didSetClassicThemeOnce, setDidSetClassicThemeOnce] = useState(false)

  useEffect(() => {
    // make sure the new theme is set on April fools day
    if (isAprilFools && !didSetClassicThemeOnce) {
      setTheme(classicThemeKey)
      setDidSetClassicThemeOnce(true)
    }
  }, [didSetClassicThemeOnce, setTheme])

  return <></>
}
