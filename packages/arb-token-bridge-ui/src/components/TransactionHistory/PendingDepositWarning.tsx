import { Disclosure } from '@headlessui/react'
import {
  InformationCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

import { ExternalLink } from '../common/ExternalLink'
import { DOCS_DOMAIN } from '../../constants'

export function PendingDepositWarning() {
  return (
    <Disclosure
      as="div"
      className="mt-4 flex w-full flex-col justify-start gap-1 rounded border border-orange-dark bg-orange p-3 text-sm text-orange-dark"
    >
      <Disclosure.Button className="flex items-center text-left">
        <div className="flex items-start gap-1">
          <InformationCircleIcon className="mt-[2px] h-3 w-3 shrink-0 stroke-orange-dark" />
          <p>
            Deposit might fail if the gas fee provided was too low. Stay on this
            page until the transaction succeeds.
          </p>
        </div>
        <ChevronRightIcon className="ml-auto h-3 w-3 shrink-0 ui-open:rotate-90 ui-open:transform" />
      </Disclosure.Button>
      <Disclosure.Panel className="flex flex-col gap-2 pl-4">
        <p>
          If you must leave, check back <strong>within a week</strong>. In most
          cases, your deposits should go through successfully.
          <br />
          However, if it failed, re-execute <strong>within a week</strong> from
          the time of the initial transaction, or else{' '}
          <strong>your funds could be lost forever!</strong>
        </p>
        <p>
          Learn more about{' '}
          <ExternalLink
            href={`${DOCS_DOMAIN}/arbos/l1-to-l2-messaging`}
            className="arb-hover text-blue-link underline"
          >
            retryable tickets
          </ExternalLink>
          , the mechanism behind deposits.
        </p>
      </Disclosure.Panel>
    </Disclosure>
  )
}
