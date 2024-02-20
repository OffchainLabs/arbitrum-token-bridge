import { useEffect, useMemo, useState } from 'react'
import { useSigner } from 'wagmi'
import { BigNumber, constants, utils } from 'ethers'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { SafeImage } from '../common/SafeImage'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { getExplorerUrl, isNetwork } from '../../util/networks'
import { useGasPrice } from '../../hooks/useGasPrice'
import { approveCustomFeeTokenEstimateGas } from './CustomFeeTokenUtils'
import { NativeCurrencyErc20 } from '../../hooks/useNativeCurrency'
import { useAppState } from '../../state'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { shortenAddress } from '../../util/CommonUtils'
import { NoteBox } from '../common/NoteBox'

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

  const [networks] = useNetworks()
  const { childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)
  const { isEthereumMainnet } = isNetwork(parentChain.id)

  const { data: l1Signer } = useSigner({ chainId: parentChain.id })
  const l1GasPrice = useGasPrice({ provider: parentChainProvider })

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
            l1Provider: parentChainProvider,
            l2Provider: childChainProvider
          })
        )
      }
    }

    getEstimatedGas()
  }, [isOpen, selectedToken, l1Signer, childChainProvider, parentChainProvider])

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setChecked(false)
  }

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <div className="flex flex-row items-center space-x-3">
          <SafeImage
            src={customFeeToken.logoUrl}
            alt={`${customFeeToken.name} logo`}
            className="h-6 w-6 grow-0"
            fallback={
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/30 bg-gray-dark text-sm font-medium">
                ?
              </div>
            }
          />
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="text-base">{customFeeToken.symbol}</span>
              <span className="text-xs text-white/70">
                {customFeeToken.name}
              </span>
            </div>
            <ExternalLink
              href={`${getExplorerUrl(parentChain.id)}/token/${
                customFeeToken.address
              }`}
              className="arb-hover text-xs underline"
            >
              {shortenAddress(customFeeToken.address)}
            </ExternalLink>
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
                approval fee of {approvalFeeText}
              </span>{' '}
              for this.
            </span>
          }
          checked={checked}
          onChange={setChecked}
        />

        <div className="flex flex-col">
          <NoteBox>
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
          </NoteBox>
        </div>
      </div>
    </Dialog>
  )
}
