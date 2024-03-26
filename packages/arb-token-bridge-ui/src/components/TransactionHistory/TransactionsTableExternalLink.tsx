import { Fragment, PropsWithChildren, useState } from 'react'

import { ExternalLink } from '../common/ExternalLink'
import { Transition } from '@headlessui/react'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

export const TransactionsTableExternalLink = ({
  children,
  href,
  disabled = false
}: PropsWithChildren<{ href: string; disabled?: boolean }>) => {
  const [show, setShow] = useState(false)

  if (disabled) {
    return children
  }

  return (
    <ExternalLink
      href={href}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      className="arb-hover flex items-center space-x-2"
    >
      {children}
      <Transition show={show} as={Fragment}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="translate-x-4 opacity-0"
          enterTo="translate-x-0 opacity-100"
          leave="ease-in duration-150"
          leaveFrom="translate-x-0 opacity-100"
          leaveTo="translate-x-4 opacity-0"
        >
          <ArrowTopRightOnSquareIcon height={10} />
        </Transition.Child>
      </Transition>
    </ExternalLink>
  )
}
