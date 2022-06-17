import { useMemo } from 'react'
import { BigNumber, utils } from 'ethers'
import { ExternalLinkIcon, ArrowRightIcon } from '@heroicons/react/outline'

import { useAppState } from '../../state'
import { formatNumber } from '../../util/NumberUtils'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'

import LowBalanceDialogContent from './LowBalanceDialogContent.json'

type ExternalLinkCardProps = {
  href: string
  title: string
  imageSrc: string
}

function ExternalLinkCard({ href, title, imageSrc }: ExternalLinkCardProps) {
  return (
    <ExternalLink href={href} className="arb-hover">
      <div className="flex flex-col space-y-1 rounded-lg border border-v3-gray-6 bg-white p-1">
        <div className="flex w-full justify-between">
          <div className="w-4" />
          <img
            src={imageSrc}
            alt={title}
            className="mt-2 h-10 w-10 rounded-full"
          />
          <ExternalLinkIcon className="h-4 w-4 text-v3-gray-6" />
        </div>
        <div className="flex w-full justify-center">
          <span className="text-xs sm:text-base">{title}</span>
        </div>
      </div>
    </ExternalLink>
  )
}

export function LowBalanceDialog(props: UseDialogProps) {
  const { l1 } = useNetworksAndSigners()
  const { app } = useAppState()
  const { toUSD } = useETHPrice()

  const balance = useMemo(() => {
    if (
      typeof app.arbTokenBridge === 'undefined' ||
      typeof app.arbTokenBridge.balances === 'undefined'
    ) {
      return BigNumber.from(0)
    }

    return app.arbTokenBridge.balances.eth.balance || BigNumber.from(0)
  }, [app.arbTokenBridge])

  const balanceNumber = useMemo(
    () => parseFloat(utils.formatEther(balance)),
    [balance]
  )

  return (
    <Dialog {...props} isCustom>
      <div className="lg:max-w-628px flex flex-col px-8 py-4">
        <div className="flex w-full flex-col items-center space-y-2">
          <div className="flex flex-row space-x-2">
            <img
              src="/icons/ethereum.png"
              alt="Ethereum"
              className="h-8 opacity-50"
            />
            <span className="text-2xl text-v3-ethereum-dark-purple">
              {l1.network?.name} Balance
            </span>
          </div>
          <span className="text-center text-3xl font-light text-v3-ethereum-dark-purple">
            {formatNumber(balanceNumber)} ETH{' '}
            <span className="font-medium">
              (${formatNumber(toUSD(balanceNumber), 2)})
            </span>
          </span>
        </div>
        <div className="h-4" />
        <div className="flex flex-col space-y-4">
          <button
            className="arb-hover flex w-full items-center justify-between rounded-lg bg-v3-gray-3 p-4 text-left text-xl text-v3-arbitrum-dark-blue"
            onClick={() => props.onClose(false)}
          >
            <span>Go to bridge</span>
            <ArrowRightIcon className="h-8 w-8 text-v3-arbitrum-dark-blue" />
          </button>
          <div className="rounded-lg bg-v3-gray-3 p-4">
            <span className="text-xl text-v3-arbitrum-dark-blue">
              Skip the bridge
            </span>
            <div className="h-2" />
            <p className="pb-1 font-light text-v3-dark">
              Given your wallet balance, bridging gas fees (~$20-$40) might not
              be worth it. You can skip bridging and move funds directly to
              Arbitrum from a CEX or fiat on-ramp.
            </p>

            <ExternalLink href="#" className="arb-hover font-light underline">
              Learn more.
            </ExternalLink>

            <p className="py-3 font-medium">Centralized Exchanges</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {LowBalanceDialogContent.CentralizedExchanges.map(props => (
                <ExternalLinkCard key={props.href} {...props} />
              ))}
            </div>

            <p className="py-3 font-medium">Fiat on-ramps</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {LowBalanceDialogContent.FiatOnRamps.map(props => (
                <ExternalLinkCard key={props.href} {...props} />
              ))}
            </div>
          </div>
        </div>
        <div className="h-4" />
        <p className="text-sm font-light">
          Want to see another protocol?{' '}
          <ExternalLink className="underline">Let us know.</ExternalLink>
        </p>
      </div>
    </Dialog>
  )
}
