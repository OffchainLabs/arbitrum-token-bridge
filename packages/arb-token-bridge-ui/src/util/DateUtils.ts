import dayjs from 'dayjs'

import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import advanced from 'dayjs/plugin/advancedFormat'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advanced)

const EASTERN_TIMEZONE = 'America/New_York'
const DISPLAY_DATETIME_FORMAT = 'MMMM DD, hh:mm A z'
const DISPLAY_DATETIME_FORMAT_WITH_YEAR = 'MMMM DD YYYY, hh:mm A z'

export const getCurrentDateInEasternTime = () => {
  return dayjs.utc().tz(EASTERN_TIMEZONE)
}

/** given the date in Eastern time (eg. for Arcade/Missions), parse it into dayjs format */
export const parseDateInEasternTime = (date: string) => {
  return dayjs(date).tz(EASTERN_TIMEZONE, true)
}

export const formatDate = (date: string) => {
  if (dayjs(date).year() !== new Date().getFullYear()) {
    return parseDateInEasternTime(date).format(
      DISPLAY_DATETIME_FORMAT_WITH_YEAR
    )
  }
  return parseDateInEasternTime(date).format(DISPLAY_DATETIME_FORMAT)
}

/** export the timezone extended `dayjs` and use that instead of re-initializing in components */
export { dayjs }
