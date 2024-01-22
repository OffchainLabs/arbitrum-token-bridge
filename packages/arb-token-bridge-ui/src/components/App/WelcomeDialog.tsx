import { useRef } from 'react'
import { Dialog as HeadlessUIDialog } from '@headlessui/react'
import Image from 'next/image'

import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import { Dialog, UseDialogProps } from '../common/Dialog'

export function WelcomeDialog(props: UseDialogProps) {
  const confirmButtonRef = useRef(null)

  const closeHandler = () => {
    props.onClose(true)
  }

  return (
    <Dialog
      {...props}
      initialFocus={confirmButtonRef}
      isCustom
      className="mx-auto my-3 flex max-w-[340px] flex-col rounded-lg px-8 py-4 md:max-w-[600px]"
    >
      <HeadlessUIDialog.Title className="text-2xl font-medium">
        Welcome
      </HeadlessUIDialog.Title>

      <div className="flex grow flex-col items-center gap-8 md:flex-row md:items-stretch">
        <Image
          src="/images/arbinaut-flying.webp"
          alt="An Astronaut in an Arbitrum space suit"
          width={256}
          height={383}
          className="h-[55vh] max-h-[383px] w-auto"
        />
        <div className="flex grow flex-col justify-between font-light">
          <p>We will NEVER ask you for your seed phrase or private keys.</p>
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              By clicking the button below, you agree to our{' '}
              <ExternalLink
                href="https://arbitrum.io/tos"
                className="arb-hover underline"
              >
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
    </Dialog>
  )
}
