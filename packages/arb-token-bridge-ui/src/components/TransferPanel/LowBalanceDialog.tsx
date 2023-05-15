import { useState, useMemo, useRef, useEffect } from 'react'
import { constants, utils } from 'ethers'
import { ExternalLinkIcon, ArrowRightIcon } from '@heroicons/react/outline'
import Image from 'next/image'

import { useBalance } from '../../hooks/useBalance'
import { useAppState } from '../../state'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { getNetworkName, isNetwork } from '../../util/networks'
import { trackEvent } from '../../util/AnalyticsUtils'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'

import {
  LowBalanceDialogContent,
  CEXName,
  FiatOnRampName
} from './LowBalanceDialogContent'

type ExternalLinkCardDynamicProps =
  | {
      type: 'cex'
      title: CEXName
    }
  | {
      type: 'fiat'
      title: FiatOnRampName
    }

type ExternalLinkCardStaticProps = {
  href: string
  imageSrc: string
}

type ExternalLinkCardProps = ExternalLinkCardDynamicProps &
  ExternalLinkCardStaticProps

function ExternalLinkCard({
  type,
  title,
  href,
  imageSrc
}: ExternalLinkCardProps) {
  return (
    <ExternalLink
      href={href}
      className="arb-hover"
      onClick={() => {
        if (type === 'cex') {
          trackEvent('CEX Click', { project: title })
        } else {
          trackEvent('Fiat On-Ramp Click', { project: title })
        }
      }}
    >
      <div className="flex flex-col space-y-1 rounded-lg border border-gray-6 bg-white p-1">
        <div className="flex w-full justify-between">
          <div className="w-4" />
          <Image
            src={imageSrc}
            alt={title}
            className="mt-2 h-10 w-10 rounded-full"
            width={40}
            height={40}
          />
          <ExternalLinkIcon className="h-4 w-4 text-gray-6" />
        </div>
        <div className="flex w-full justify-center">
          <span className="text-xs sm:text-base">{title}</span>
        </div>
      </div>
    </ExternalLink>
  )
}

export function LowBalanceDialog(props: UseDialogProps) {
  const { app } = useAppState()
  const { ethToUSD } = useETHPrice()
  const { l1 } = useNetworksAndSigners()

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { isMainnet } = isNetwork(l1.network.chainID)
  const {
    eth: [ethBalance]
  } = useBalance({
    provider: l1.provider,
    walletAddress: app.arbTokenBridge.walletAddress
  })

  const balance = useMemo(() => ethBalance ?? constants.Zero, [ethBalance])

  const balanceNumber = useMemo(
    () => parseFloat(utils.formatEther(balance)),
    [balance]
  )

  useEffect(() => {
    if (isFormOpen && iframeRef.current) {
      iframeRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isFormOpen])

  return (
    <Dialog {...props} isCustom>
      <div className="flex flex-col px-8 py-4 md:max-w-[628px]">
        <div className="flex w-full flex-col items-center space-y-2">
          <div className="flex flex-row space-x-2">
            <Image
              src="/icons/ethereum.webp"
              alt="Ethereum"
              className="h-8 w-auto opacity-50"
              width={32}
              height={32}
            />
            <span className="text-2xl text-eth-dark">
              {getNetworkName(l1.network.chainID)} Balance
            </span>
          </div>
          <span className="text-center text-3xl font-light text-eth-dark">
            {formatAmount(balanceNumber, { symbol: 'ETH' })}{' '}
            {isMainnet && (
              <span className="font-medium">
                ({formatUSD(ethToUSD(balanceNumber))})
              </span>
            )}
          </span>
        </div>
        <div className="h-4" />
        <div className="flex flex-col space-y-4">
          <button
            className="arb-hover flex w-full items-center justify-between rounded-lg bg-gray-3 p-4 text-left text-xl text-blue-arbitrum"
            onClick={() => props.onClose(false)}
          >
            <span>Go to bridge</span>
            <ArrowRightIcon className="h-8 w-8 text-blue-arbitrum" />
          </button>
          <div className="rounded-lg bg-gray-3 p-4">
            <span className="text-xl text-blue-arbitrum">Skip the bridge</span>
            <div className="h-2" />
            <p className="pb-1 font-light text-dark">
              Given your wallet balance, bridging gas fees (~$2-5) might not be
              worth it. You can skip bridging and move funds directly to
              Arbitrum from a Centralized Exchange or fiat on-ramp.
            </p>

            <ExternalLink
              href="https://consensys.zendesk.com/hc/en-us/articles/7277875099547"
              className="arb-hover font-light underline"
            >
              Learn more.
            </ExternalLink>

            <p className="py-3 font-medium">Centralized Exchanges</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {LowBalanceDialogContent.CentralizedExchanges.map(props => (
                <ExternalLinkCard key={props.href} type="cex" {...props} />
              ))}
            </div>

            <p className="py-3 font-medium">Fiat on-ramps</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {LowBalanceDialogContent.FiatOnRamps.map(props => (
                <ExternalLinkCard key={props.href} type="fiat" {...props} />
              ))}
            </div>
          </div>
        </div>

        <div className="h-4" />
        <div>
          <span className="text-sm font-light">
            Is this list missing something?
          </span>{' '}
          <button
            className="text-sm font-light underline"
            onClick={() => setIsFormOpen(true)}
          >
            Let us know.
          </button>
        </div>

        {isFormOpen && (
          <>
            <div className="h-2" />
            <iframe
              ref={iframeRef}
              src="https://arbitrum-bridge-ui-feedback-form.vercel.app"
              title="Feedback form"
              height="68px"
            />
          </>
        )}
      </div>
    </Dialog>
  )
}
