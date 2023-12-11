import { useEffect, useMemo, useState } from 'react'
import { useSigner } from 'wagmi'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { BigNumber, constants, utils } from 'ethers'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { SafeImage } from '../common/SafeImage'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { isNetwork } from '../../util/networks'
import { useGasPrice } from '../../hooks/useGasPrice'
import { approveCustomFeeTokenEstimateGas } from './CustomFeeTokenUtils'
import { NativeCurrencyErc20 } from '../../hooks/useNativeCurrency'
import { useAppState } from '../../state'
import {
  ExplorerAddressLink,
  ExplorerTokenLink
} from '../common/atoms/ExplorerLink'

export type CustomFeeTokenApprovalDialogProps = UseDialogProps & {
  customFeeToken: NativeCurrencyErc20
}

export function CustomFeeTokenApprovalDialog(
  props: CustomFeeTokenApprovalDialogProps
) {
  const { customFeeToken, isOpen } = props

  const { ethToUSD } = useETHPrice()
  const { app } = useAppState()
  const { selectedToken } = app

  const { l1, l2 } = useNetworksAndSigners()
  const { isEthereumMainnet } = isNetwork(l1.network.id)

  const { data: l1Signer } = useSigner({ chainId: l1.network.id })
  const l1GasPrice = useGasPrice({ provider: l1.provider })

  const [checked, setChecked] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>(constants.Zero)

  // Estimated gas fees, denominated in Ether, represented as a floating point number
  const estimatedGasFees = useMemo(
    () => parseFloat(utils.formatEther(estimatedGas.mul(l1GasPrice))),
    [estimatedGas, l1GasPrice]
  )

  const approvalFeeText = useMemo(() => {
    const eth = formatAmount(estimatedGasFees, { symbol: 'ETH' })
    const usd = formatUSD(ethToUSD(estimatedGasFees))
    return `${eth}${isEthereumMainnet ? ` (${usd})` : ''}`
  }, [estimatedGasFees, ethToUSD, isEthereumMainnet])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    async function getEstimatedGas() {
      if (l1Signer) {
        setEstimatedGas(
          await approveCustomFeeTokenEstimateGas({
            erc20L1Address: selectedToken?.address,
            l1Signer,
            l1Provider: l1.provider,
            l2Provider: l2.provider
          })
        )
      }
    }

    getEstimatedGas()
  }, [isOpen, selectedToken, l1Signer, l1.provider, l2.provider])

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setChecked(false)
  }

  if (!customFeeToken) {
    return null
  }

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-6 md:max-w-[490px]">
        <div className="flex flex-row items-center space-x-4">
          <SafeImage
            src={customFeeToken.logoUrl}
            alt={`${customFeeToken.name} logo`}
            className="h-8 w-8 grow-0 rounded-full"
            fallback={
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ocl-blue text-sm font-medium text-white">
                ?
              </div>
            }
          />
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-base font-medium text-gray-900">
                {customFeeToken.symbol}
              </span>
              <span className="text-xs text-gray-500">
                {customFeeToken.name}
              </span>
            </div>
            <ExplorerTokenLink
              explorerUrl={l1.network.blockExplorers?.default.url}
              tokenAddress={customFeeToken.address}
              className="text-xs"
            />
          </div>
        </div>

        <span className="font-light">
          The network you are trying to deposit to uses{' '}
          <span className="font-medium">
            {customFeeToken.name} ({customFeeToken.symbol})
          </span>{' '}
          as the fee token. Before continuing with your deposit, you must first
          allow the bridge contract to access your{' '}
          <span className="font-medium">{customFeeToken.symbol}</span>.
        </span>

        <Checkbox
          label={
            <span className="font-light">
              I understand that I have to pay a one-time{' '}
              <span className="font-medium">
                approval fee of {approvalFeeText}*
              </span>{' '}
              for this.
            </span>
          }
          checked={checked}
          onChange={setChecked}
        />

        <div className="flex flex-col md:max-w-[490px]">
          <div
            className={`flex flex-row items-center space-x-2 rounded-lg bg-cyan px-2 py-3`}
          >
            <InformationCircleIcon className="h-6 w-6 text-cyan-dark" />
            {selectedToken ? (
              <span className="text-sm font-light text-cyan-dark">
                After approval, you&apos;ll see additional prompts related to
                depositing your{' '}
                <span className="font-medium">{selectedToken.symbol}</span>.
              </span>
            ) : (
              <span className="text-sm font-light text-cyan-dark">
                After approval, you&apos;ll see an additional prompt in your
                wallet to deposit your{' '}
                <span className="font-medium">{customFeeToken.symbol}</span>.
              </span>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
