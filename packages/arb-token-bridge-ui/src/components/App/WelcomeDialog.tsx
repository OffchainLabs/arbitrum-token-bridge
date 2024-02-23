import * as Sentry from '@sentry/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useCallback } from 'react'
import { useLocalStorage } from '@uidotdev/usehooks'

import { ExternalLink } from '../common/ExternalLink'
import { errorToast } from '../common/atoms/Toast'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { Button } from '../common/Button'

export function WelcomeDialog() {
  const [, setTosAccepted] = useLocalStorage<boolean>(
    TOS_LOCALSTORAGE_KEY,
    false
  )

  const { openConnectModal } = useConnectModal()

  const closeHandler = useCallback(() => {
    setTosAccepted(true)

    try {
      openConnectModal?.()
    } catch (error) {
      errorToast('Failed to open up RainbowKit Connect Modal')
      Sentry.captureException(error)
    }
  }, [openConnectModal, setTosAccepted])

  return (
    <div className="mx-4 my-16 max-w-[380px] overflow-hidden rounded border border-gray-dark bg-gray-1 pt-3 text-white sm:mx-auto">
      <p className="px-4 text-xl">Welcome</p>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1 rounded bg-white/10 p-3 text-sm">
          <p className="font-medium">Safety Tip</p>
          <p>NEVER share your seed phrase or private keys.</p>
        </div>
        <p className="text-sm">
          Click the button below to agree to our{' '}
          <ExternalLink
            href="https://arbitrum.io/tos"
            className="arb-hover underline"
          >
            Terms of Service
          </ExternalLink>
          .
        </p>
      </div>
      <div className="flex flex-row justify-end space-x-2 bg-[#3B3B3B] px-4 py-2">
        <Button
          variant="primary"
          onClick={closeHandler}
          aria-label="Agree to Terms and Continue"
        >
          Agree to Terms and Continue
        </Button>
      </div>
    </div>
  )
}
