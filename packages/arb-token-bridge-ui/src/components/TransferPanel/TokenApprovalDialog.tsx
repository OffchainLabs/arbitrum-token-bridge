import { useEffect, useMemo, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/outline'
import { BigNumber, utils } from 'ethers'
import { ERC20BridgeToken } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { SafeImage } from '../common/SafeImage'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useGasPrice } from '../../hooks/useGasPrice'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatNumber, formatUSD } from '../../util/NumberUtils'
import { isNetwork } from '../../util/networks'

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { token } = props
  const {
    app: { arbTokenBridge }
  } = useAppState()

  const { toUSD } = useETHPrice()
  const { l1GasPrice } = useGasPrice()
  const { l1 } = useNetworksAndSigners()
  const { isMainnet } = isNetwork(l1.network)

  const [checked, setChecked] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>(BigNumber.from(0))

  // Estimated gas fees, denominated in Ether, represented as a floating point number
  const estimatedGasFees = useMemo(
    () => parseFloat(utils.formatEther(estimatedGas.mul(l1GasPrice))),
    [estimatedGas, l1GasPrice]
  )

  const approvalFeeText = useMemo(() => {
    const eth = formatNumber(estimatedGasFees)
    const usd = formatUSD(toUSD(estimatedGasFees))
    return `${eth} ETH${isMainnet ? ` (${usd})` : ''}`
  }, [estimatedGasFees, toUSD, isMainnet])

  useEffect(() => {
    async function getEstimatedGas() {
      if (token?.address) {
        setEstimatedGas(
          await arbTokenBridge.token.approveEstimateGas(token.address)
        )
      }
    }

    getEstimatedGas()
  }, [token?.address])

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setChecked(false)
  }

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval and deposit fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-6 md:max-w-[490px]">
        <div className="flex flex-row items-center space-x-4">
          <SafeImage
            src={token?.logoURI}
            alt={`${token?.name} logo`}
            className="h-8 w-8 flex-grow-0 rounded-full"
            fallback={
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-arbitrum text-sm font-medium text-white">
                ?
              </div>
            }
          />
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-base font-medium text-gray-900">
                {token?.symbol}
              </span>
              <span className="text-xs text-gray-500">{token?.name}</span>
            </div>
            <ExternalLink
              href={`${l1.network?.explorerUrl}/token/${token?.address}`}
              className="text-xs text-blue-link underline"
            >
              {token?.address.toLowerCase()}
            </ExternalLink>
          </div>
        </div>

        <Checkbox
          label={
            <span className="font-light">
              I understand that I have to pay a one-time{' '}
              <span className="font-medium">
                approval fee of {approvalFeeText}*
              </span>{' '}
              for each new token I add to my wallet.
            </span>
          }
          checked={checked}
          onChange={setChecked}
        />

        <div className="flex flex-row items-center space-x-2 rounded-lg bg-cyan py-3 px-2">
          <InformationCircleIcon className="h-6 w-6 text-cyan-dark" />
          <span className="text-sm font-light text-cyan-dark">
            After approval, you’ll see a second prompt in your wallet for the
            standard L2 deposit fee.{' '}
            <ExternalLink
              href="https://consensys.zendesk.com/hc/en-us/articles/7276949409819"
              className="underline"
            >
              Learn more.
            </ExternalLink>
          </span>
        </div>
      </div>
    </Dialog>
  )
}
