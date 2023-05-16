import { useRef } from 'react'
import { Dialog as HeadlessUIDialog } from '@headlessui/react'
import Image from 'next/image'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import * as Sentry from '@sentry/react'

import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { errorToast } from '../common/atoms/Toast'

export function WelcomeDialog(props: UseDialogProps) {
  const confirmButtonRef = useRef(null)
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
    <Dialog {...props} initialFocus={confirmButtonRef} isCustom>
      <div className="px-8 py-4">
        <HeadlessUIDialog.Title className="text-2xl font-medium">
          Welcome
        </HeadlessUIDialog.Title>

        <div className="flex flex-col items-center space-y-8 md:flex-row md:space-x-8 md:space-y-0">
          <div>
            <Image
              src="/images/arbinaut-flying.webp"
              alt="An Astronaut in an Arbitrum space suit"
              className="w-64"
              width={256}
              height={383}
            />
          </div>
          <div className="flex flex-col justify-between md:h-[384px] md:w-64">
            <div className="flex flex-col space-y-4">
              <p className="font-light">
                We will NEVER ask you for your seed phrase or private keys.
              </p>

              <p className="font-light">
                Arbitrum is in beta – we’ve got some extra controls in place to
                protect you.{' '}
                <ExternalLink
                  href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
                  className="arb-hover underline"
                >
                  Learn more.
                </ExternalLink>
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-light">
                By clicking the button below, you agree to our{' '}
                <ExternalLink href="/tos" className="arb-hover underline">
                  Terms of Service.
                </ExternalLink>
              </p>

              <Button
                ref={confirmButtonRef}
                variant="primary"
                className="w-full"
                onClick={closeHandler}
              >
                Agree to terms
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
