import { Disclosure, Transition } from '@headlessui/react'
import {
  InformationCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

import { ExternalLink } from '../common/ExternalLink'

export function PendingDepositWarning() {
  return (
    <Disclosure
      as="div"
      className="flex w-full flex-col justify-start gap-1 rounded-lg bg-orange p-3 text-sm text-orange-dark"
    >
      <Disclosure.Button className="flex items-center text-left">
        <div className="flex items-start gap-1">
          <InformationCircleIcon className="mt-[2px] h-4 w-4 shrink-0 stroke-orange-dark" />
          <p>
            Deposit might fail if the gas fee provided was too low. Stay on this
            page until the L2 transaction succeeds.
          </p>
        </div>
        <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 ui-open:rotate-90 ui-open:transform" />
      </Disclosure.Button>
      <Transition
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Disclosure.Panel className="flex flex-col gap-2 pl-5">
          <p>
            If you must leave, check back <strong>within a week</strong>. In
            most cases, your deposits should go through successfully.
            <br />
            However, if it failed, re-execute on L2{' '}
            <strong>within a week</strong> from the time of the L1 transaction,
            or else <strong>your funds could be lost forever!</strong>
          </p>
          <p>
            Learn more about{' '}
            <ExternalLink
              href="https://developer.arbitrum.io/arbos/l1-to-l2-messagings"
              className="arb-hover text-blue-link underline"
            >
              retryable tickets
            </ExternalLink>
            , the mechanism behind deposits.
          </p>
        </Disclosure.Panel>
      </Transition>
    </Disclosure>
  )
}
