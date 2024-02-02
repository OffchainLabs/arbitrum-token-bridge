import { useEffect, useMemo, useState } from 'react'
import {
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { BigNumber, constants, utils } from 'ethers'
import { useAccount, useChainId } from 'wagmi'

import { useSigner } from 'wagmi'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { SafeImage } from '../common/SafeImage'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useGasPrice } from '../../hooks/useGasPrice'
import { TOKEN_APPROVAL_ARTICLE_LINK, ether } from '../../constants'
import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import { approveTokenEstimateGas } from '../../util/TokenApprovalUtils'
import { getCctpContracts } from '@/token-bridge-sdk/cctp'
import {
  fetchErc20L2GatewayAddress,
  fetchErc20ParentChainGatewayAddress
} from '../../util/TokenUtils'
import { shortenTxHash } from '../../util/CommonUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null
  allowance: BigNumber | null
  amount: string
  isCctp: boolean
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { address: walletAddress } = useAccount()
  const { allowance, isOpen, amount, token, isCctp } = props

  const allowanceParsed =
    allowance && token ? utils.formatUnits(allowance, token.decimals) : 0
  const { ethToUSD } = useETHPrice()

  const [networks] = useNetworks()
  const { sourceChainProvider, destinationChainProvider } = networks
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)
  const { isEthereumMainnet, isTestnet } = isNetwork(parentChain.id)
  const provider = isDepositMode ? parentChainProvider : childChainProvider
  const gasPrice = useGasPrice({ provider })
  const chainId = useChainId()
  const { data: signer } = useSigner({
    chainId
  })

  const [checked, setChecked] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>(constants.Zero)
  const [contractAddress, setContractAddress] = useState<string>('')

  // Estimated gas fees, denominated in Ether, represented as a floating point number
  const estimatedGasFees = useMemo(
    () => parseFloat(utils.formatEther(estimatedGas.mul(gasPrice))),
    [estimatedGas, gasPrice]
  )

  const approvalFeeText = useMemo(() => {
    const eth = formatAmount(estimatedGasFees, { symbol: ether.symbol })
    const usd = formatUSD(ethToUSD(estimatedGasFees))
    return `${eth}${isEthereumMainnet ? ` (${usd})` : ''}`
  }, [estimatedGasFees, ethToUSD, isEthereumMainnet])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    async function getEstimatedGas() {
      if (!token?.address) {
        return
      }

      let gasEstimate

      if (isCctp) {
        if (!signer) {
          gasEstimate = constants.Zero
        } else {
          const cctpTransferStarter = new CctpTransferStarter({
            sourceChainProvider,
            destinationChainProvider
          })
          gasEstimate = await cctpTransferStarter.approveTokenEstimateGas({
            amount: constants.MaxUint256,
            signer
          })
        }
      } else if (walletAddress) {
        gasEstimate = await approveTokenEstimateGas({
          erc20L1Address: token.address,
          address: walletAddress,
          l1Provider: parentChainProvider,
          l2Provider: childChainProvider
        })
      }

      if (gasEstimate) {
        setEstimatedGas(gasEstimate)
      }
    }

    getEstimatedGas()
  }, [
    isCctp,
    isOpen,
    isDepositMode,
    isTestnet,
    signer,
    walletAddress,
    token?.address,
    sourceChainProvider,
    destinationChainProvider,
    parentChainProvider,
    childChainProvider,
    chainId
  ])

  useEffect(() => {
    const getContractAddress = async function () {
      if (isCctp) {
        setContractAddress(
          getCctpContracts({ sourceChainId: chainId })
            ?.tokenMessengerContractAddress
        )
        return
      }
      if (!token?.address) {
        setContractAddress('')
        return
      }
      if (isDepositMode) {
        setContractAddress(
          await fetchErc20ParentChainGatewayAddress({
            erc20L1Address: token.address,
            parentChainProvider,
            childChainProvider
          })
        )
        return
      }
      setContractAddress(
        await fetchErc20L2GatewayAddress({
          erc20L1Address: token.address,
          l2Provider: childChainProvider
        })
      )
    }
    getContractAddress()
  }, [
    chainId,
    childChainProvider,
    isCctp,
    isDepositMode,
    parentChainProvider,
    token?.address
  ])

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)

    setChecked(false)
  }

  const displayAllowanceWarning = allowance && !allowance.isZero()
  const destinationNetworkName = getNetworkName(networks.destinationChain.id)

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
                isDepositMode ? parentChain.id : childChain.id
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
              for each new token or spending cap. This transaction gives
              permission to the{' '}
              <ExternalLink
                className="text-blue-link underline"
                href={`${getExplorerUrl(chainId)}/address/${contractAddress}`}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                  event.stopPropagation()
                }}
              >
                {shortenTxHash(contractAddress)}
              </ExternalLink>{' '}
              contract to transfer a capped amount of a specific token.
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
              After approval, you&apos;ll see a second prompt in your wallet for
              the {isDepositMode ? 'deposit' : 'withdrawal'} transaction.
              <ExternalLink
                href={TOKEN_APPROVAL_ARTICLE_LINK}
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
