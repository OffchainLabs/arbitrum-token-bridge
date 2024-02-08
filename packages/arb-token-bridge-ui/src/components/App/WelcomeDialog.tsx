import * as Sentry from '@sentry/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'

import { ExternalLink } from '../common/ExternalLink'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { errorToast } from '../common/atoms/Toast'

export function WelcomeDialog(props: UseDialogProps) {
  const { openConnectModal } = useConnectModal()

  const closeHandler = () => {
    props.onClose(true)

    try {
      openConnectModal?.()
    } catch (error) {
      errorToast('Failed to open up RainbowKit Connect Modal')
      Sentry.captureException(error)
    }
  }

  return (
    <Dialog
      {...props}
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
