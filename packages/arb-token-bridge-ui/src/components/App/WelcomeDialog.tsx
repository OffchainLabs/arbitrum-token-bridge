import { useRef } from 'react'
import { Dialog as HeadlessUIDialog } from '@headlessui/react'
import { useRouteMatch } from 'react-router-dom'

import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import { Dialog, UseDialogProps } from '../common/Dialog'

export function WelcomeDialog(props: UseDialogProps) {
  const confirmButtonRef = useRef(null)
  const isTosRoute = useRouteMatch('/tos')

  if (isTosRoute) {
    return null
  }

  return (
    <Dialog {...props} initialFocus={confirmButtonRef} isCustom>
      <div className="px-8 py-4">
        <HeadlessUIDialog.Title className="text-2xl font-medium">
          Welcome
        </HeadlessUIDialog.Title>

        <div className="flex flex-col items-center space-y-8 lg:flex-row lg:space-y-0 lg:space-x-8">
          <div>
            <img
              src="/images/arbinaut-flying.png"
              alt="An Astronaut in an Arbitrum space suit"
              className="w-64"
            />
          </div>
          <div className="flex flex-col justify-between lg:h-[384px] lg:w-64">
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
                onClick={() => props.onClose(true)}
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
