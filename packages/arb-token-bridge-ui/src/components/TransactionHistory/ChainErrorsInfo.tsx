import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel
} from '@headlessui/react'
import {
  XCircleIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon,
  DocumentIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { ChainError, ChainPair } from '../../hooks/useTransactionHistory'
import { Tooltip } from '../common/Tooltip'
import { getNetworkName } from '../../util/networks'
import { NetworkImage } from '../common/NetworkImage'
import { useCopyToClipboard } from '@uidotdev/usehooks'
import { successToast } from '../common/atoms/Toast'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { stackoverflowDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

function Networks({ networks }: { networks: ChainPair }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <NetworkImage chainId={networks.parentChainId} className="h-5 w-5" />
        <span>{getNetworkName(networks.parentChainId)}</span>
      </div>
      <ArrowsRightLeftIcon width={20} />
      <div className="flex items-center space-x-1">
        <NetworkImage chainId={networks.childChainId} className="h-5 w-5" />
        <span>{getNetworkName(networks.childChainId)}</span>
      </div>
    </div>
  )
}

function ErrorTooltip({ error }: { error: string }) {
  return (
    <Tooltip
      tippyProps={{ className: 'break-all', trigger: 'click' }}
      content={
        <SyntaxHighlighter
          className="text-xs"
          language="json"
          style={stackoverflowDark}
          wrapLongLines
        >
          {error}
        </SyntaxHighlighter>
      }
    >
      <div className="arb-hover flex cursor-pointer space-x-1">
        <EyeIcon width={20} />
        <span>View details</span>
      </div>
    </Tooltip>
  )
}

function CopyErrorToClipboard({ error }: { error: string }) {
  const [, copyToClipboard] = useCopyToClipboard()

  const handleCopy = () => {
    copyToClipboard(error)
    successToast('Error message copied to clipboard.')
  }

  return (
    <button className="arb-hover flex space-x-1" onClick={handleCopy}>
      <DocumentIcon width={20} />
      <span>Copy error</span>
    </button>
  )
}

function GetHelp() {
  return (
    <ExternalLink
      className="arb-hover flex items-center space-x-1"
      href={GET_HELP_LINK}
    >
      <ChatBubbleLeftRightIcon width={20} />
      <span>Get help</span>
    </ExternalLink>
  )
}

export function ChainErrorsInfo({
  chainErrors
}: {
  chainErrors: ChainError[]
}) {
  if (chainErrors.length === 0) {
    return null
  }

  return (
    <Disclosure
      as="div"
      className="text-red-dark my-3 flex w-full flex-col justify-start gap-1 rounded border border-red-400 bg-red-900 px-3 py-2 text-sm text-white"
    >
      <DisclosureButton className="flex items-center text-left">
        <div className="flex items-start gap-1">
          <XCircleIcon width={20} />
          <p>
            Errors occurred while fetching data for some of the chains and they
            may not show in the history. Click to expand the view and see more
            info.
          </p>
        </div>
        <ChevronRightIcon className="ml-auto h-3 w-3 shrink-0 ui-open:rotate-90 ui-open:transform" />
      </DisclosureButton>
      <DisclosurePanel className="flex flex-col gap-2 pl-4">
        <ul className="mt-1">
          {chainErrors.map(chainError => (
            <li
              key={`${chainError.chainPair.parentChainId}-${chainError.chainPair.childChainId}`}
              className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center border-t border-white/50 py-2"
            >
              <Networks networks={chainError.chainPair} />
              <ErrorTooltip error={chainError.error} />
              <CopyErrorToClipboard error={chainError.error} />
              <GetHelp />
            </li>
          ))}
        </ul>
      </DisclosurePanel>
    </Disclosure>
  )
}
