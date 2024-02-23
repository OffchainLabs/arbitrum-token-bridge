import * as Sentry from '@sentry/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useCallback, useEffect } from 'react'
import { useLocalStorage } from '@uidotdev/usehooks'

import { ExternalLink } from '../common/ExternalLink'
import { Dialog, useDialog } from '../common/Dialog'
import { errorToast } from '../common/atoms/Toast'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'

export function WelcomeDialog() {
  const [welcomeDialogProps, openWelcomeDialog] = useDialog()
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(
    TOS_LOCALSTORAGE_KEY,
    false
  )

  const { openConnectModal } = useConnectModal()

  useEffect(() => {
    if (!tosAccepted) {
      openWelcomeDialog()
    }
  }, [tosAccepted, openWelcomeDialog])

  const onClose = useCallback(
    (confirmed: boolean) => {
      // Only close after confirming (agreeing to terms)
      if (confirmed) {
        setTosAccepted(true)
        welcomeDialogProps.onClose(confirmed)
      }
    },
    [setTosAccepted, welcomeDialogProps]
  )

  const closeHandler = useCallback(() => {
    onClose(true)

    try {
      openConnectModal?.()
    } catch (error) {
      errorToast('Failed to open up RainbowKit Connect Modal')
      Sentry.captureException(error)
    }
  }, [onClose, openConnectModal])

  return (
    <Dialog
      {...welcomeDialogProps}
      onClose={closeHandler}
      title="Welcome"
      actionButtonTitle="Agree to Terms and Continue"
      closeable={false}
      className="w-screen"
    >
      <div className="flex flex-col space-y-4 py-4">
        <div className="flex flex-col space-y-1 rounded bg-white/20 p-2 text-sm">
          <p className="font-medium">Safety Tip</p>
          <p>
            Arbitrum will NEVER ask you for your seed phase or private keys.
          </p>
        </div>
        <p className="text-sm">
          By clicking the button below, you agree to our{' '}
          <ExternalLink
            href="https://arbitrum.io/tos"
            className="arb-hover underline"
          >
            Terms of Service.
          </ExternalLink>
        </p>
      </div>
    </Dialog>
  )
}
