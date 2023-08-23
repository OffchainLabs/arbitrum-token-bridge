import { useEffect, useMemo, useState } from 'react'
import {
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { BigNumber, constants, utils } from 'ethers'
import { useChainId, useSigner } from 'wagmi'
import { useAppState } from '../../state'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { SafeImage } from '../common/SafeImage'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { getExplorerUrl, isNetwork } from '../../util/networks'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useGasPrice } from '../../hooks/useGasPrice'
import {
  approveCctpEstimateGas,
  approveTokenEstimateGas
} from '../../util/TokenApprovalUtils'

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null
  allowance: BigNumber | null
  amount: string
  isCctp: boolean
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { allowance, amount, isOpen, token, isCctp } = props
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()

  const allowanceParsed =
    allowance && token ? utils.formatUnits(allowance, token.decimals) : 0
  const { ethToUSD } = useETHPrice()

  const { l1, l2 } = useNetworksAndSigners()
  const { isMainnet, isTestnet } = isNetwork(l1.network.id)
  const provider = isDepositMode ? l1.provider : l2.provider
  const gasPrice = useGasPrice({ provider })
  const chainId = useChainId()
  const { data: signer } = useSigner({
    chainId
  })

  const [checked, setChecked] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>(constants.Zero)

  // Estimated gas fees, denominated in Ether, represented as a floating point number
  const estimatedGasFees = useMemo(
    () => parseFloat(utils.formatEther(estimatedGas.mul(gasPrice))),
    [estimatedGas, gasPrice]
  )

  const approvalFeeText = useMemo(() => {
    const eth = formatAmount(estimatedGasFees, { symbol: 'ETH' })
    const usd = formatUSD(ethToUSD(estimatedGasFees))
    return `${eth}${isMainnet ? ` (${usd})` : ''}`
  }, [estimatedGasFees, ethToUSD, isMainnet])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    async function getEstimatedGas() {
      if (token?.address) {
        let gasEstimate

        if (isCctp) {
          if (!signer) {
            gasEstimate = constants.Zero
          } else {
            gasEstimate = await approveCctpEstimateGas(
              chainId,
              constants.MaxUint256,
              signer
            )
          }
        } else {
          gasEstimate = await approveTokenEstimateGas({
            erc20L1Address: token.address,
            address: arbTokenBridge.walletAddress,
            l1Provider: l1.provider,
            l2Provider: l2.provider
          })
        }

        setEstimatedGas(gasEstimate)
      }
    }

    getEstimatedGas()
  }, [
    isCctp,
    isOpen,
    l1.provider,
    l2.provider,
    arbTokenBridge.walletAddress,
    token?.address,
    token?.l2Address,
    isDepositMode,
    isTestnet,
    chainId,
    amount,
    signer
  ])

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setChecked(false)
  }

  const displayAllowanceWarning = allowance && !allowance.isZero()
  const noteMessage = (() => {
    if (isDepositMode) {
      return isCctp
        ? 'the CCTP L2 deposit fee.'
        : 'the standard L2 deposit fee.'
    }
    return isCctp
      ? 'the CCTP L1 withdrawal fee.'
      : 'the standard L1 withdrawal fee.'
  })()

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
                {token?.symbol}
              </span>
              <span className="text-xs text-gray-500">{token?.name}</span>
            </div>
            <ExternalLink
              href={`${getExplorerUrl(
                isDepositMode ? l1.network.id : l2.network.id
              )}/token/${token?.address}`}
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

        <div className="flex flex-col md:max-w-[490px]">
          {displayAllowanceWarning && (
            <div className="flex flex-row items-center space-x-2 rounded-lg bg-yellow-50 px-2 py-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />
              <span className="text-sm font-light">
                You are seeing this dialog because the current allowance you
                have set for this token
                <span className="font-medium"> ({allowanceParsed}) </span>
                is less than the amount you are trying to bridge
                <span className="font-medium"> ({amount})</span>.
              </span>
            </div>
          )}

          <div
            className={`flex flex-row items-center space-x-2 rounded-lg bg-cyan px-2 py-3 ${
              displayAllowanceWarning && 'mt-4'
            }`}
          >
            <InformationCircleIcon className="h-6 w-6 text-cyan-dark" />
            <span className="text-sm font-light text-cyan-dark">
              After approval, you&apos;ll see a second prompt in your wallet for{' '}
              {noteMessage}{' '}
              <ExternalLink
                href="https://consensys.zendesk.com/hc/en-us/articles/7276949409819"
                className="underline"
              >
                Learn more.
              </ExternalLink>
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
