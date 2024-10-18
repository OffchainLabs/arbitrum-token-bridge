import { InformationCircleIcon } from '@heroicons/react/24/outline'

import { Button } from '../common/Button'
import {
  getNotificationsPermission,
  requestNotificationPermission
} from '../../util/notifications'

function BannerContent() {
  const notificationPermission = getNotificationsPermission()

  if (notificationPermission === 'granted') {
    return (
      <>
        You have enabled browser notifications. You will receive updates to your
        transactions.
        <br />
        Please ensure that your system settings allow notifications from your
        browser.
      </>
    )
  }

  // we only show text, not the button, because user has denied permission
  // so we can't prompt to request again unless they change it in browser settings
  if (notificationPermission === 'denied') {
    return 'You have disabled browser notifications. Enable them to receive updates to your transactions.'
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <InformationCircleIcon className="h-3 w-3 shrink-0 stroke-orange-dark" />
        <p>Turn on notifications to stay up to date with your transactions.</p>
      </div>
      <Button
        variant="secondary"
        className="bg-lime-dark py-1 text-xs text-lime"
        onClick={requestNotificationPermission}
      >
        Enable notifications
      </Button>
    </>
  )
}

export function EnableNotificationsBanner() {
  const notificationPermission = getNotificationsPermission()

  if (notificationPermission === 'unsupported') {
    return null
  }

  return (
    <div className="mt-4 flex w-full flex-col gap-1 rounded border border-orange-dark bg-orange p-3 text-sm text-orange-dark md:flex-row md:justify-between">
      <BannerContent />
    </div>
  )
}
