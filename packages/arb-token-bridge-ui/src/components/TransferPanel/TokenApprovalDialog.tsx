import { useEffect, useMemo, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { BigNumber, constants, utils } from 'ethers'
import { useAccount, useChainId } from 'wagmi'

import { useSigner } from 'wagmi'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Checkbox } from '../common/Checkbox'
import { ExternalLink } from '../common/ExternalLink'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { getExplorerUrl, isNetwork } from '../../util/networks'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useGasPrice } from '../../hooks/useGasPrice'
import { TOKEN_APPROVAL_ARTICLE_LINK, ether } from '../../constants'
import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import { approveTokenEstimateGas } from '../../util/TokenApprovalUtils'
import { getCctpContracts } from '@/token-bridge-sdk/cctp'
import {
  fetchErc20L1GatewayAddress,
  fetchErc20L2GatewayAddress
} from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { shortenAddress, shortenTxHash } from '../../util/CommonUtils'
import { useAppState } from '../../state'
import { sanitizeImageSrc } from '../../util'

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null
  isCctp: boolean
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { address: walletAddress } = useAccount()
  const { isOpen, token, isCctp } = props

  const { ethToUSD } = useETHPrice()

  const [networks] = useNetworks()
  const { sourceChainProvider, destinationChainProvider } = networks
  const {
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
  const {
    app: {
      arbTokenBridge: { bridgeTokens }
    }
  } = useAppState()

  const [checked, setChecked] = useState(false)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>(constants.Zero)
  const [contractAddress, setContractAddress] = useState<string>('')

  // Estimated gas fees, denominated in Ether, represented as a floating point number
  const estimatedGasFees = useMemo(
    () => parseFloat(utils.formatEther(estimatedGas.mul(gasPrice))),
    [estimatedGas, gasPrice]
  )

  const ethFeeText = useMemo(() => {
    const eth = formatAmount(estimatedGasFees, { symbol: ether.symbol })
    return eth
  }, [estimatedGasFees])

  const usdFeeText = useMemo(() => {
    const usd = formatUSD(ethToUSD(estimatedGasFees))
    return `${isEthereumMainnet ? ` (${usd})` : ''}`
  }, [estimatedGasFees, ethToUSD, isEthereumMainnet])

  const approvalFeeText = useMemo(() => {
    return `${ethFeeText} ${usdFeeText}`.trim()
  }, [ethFeeText, usdFeeText])

  const tokenLogo = useMemo(() => {
    if (typeof bridgeTokens === 'undefined') {
      return undefined
    }
    if (!token?.address) {
      return undefined
    }
    const logo = bridgeTokens[token.address]?.logoURI

    if (logo) {
      return sanitizeImageSrc(logo)
    }

    return undefined
  }, [bridgeTokens, token])

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
          await fetchErc20L1GatewayAddress({
            erc20L1Address: token.address,
            l1Provider: parentChainProvider,
            l2Provider: childChainProvider
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

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval and deposit fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="md:max-w-screen flex w-[727px] flex-col space-y-4">
        <div className="flex flex-row items-center space-x-3">
          {tokenLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tokenLogo}
              alt="Token logo"
              className="h-5 w-5 sm:h-8 sm:w-8"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-gray-dark text-sm font-medium">
              ?
            </div>
          )}

          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="text-base">{token?.symbol}</span>
              <span className="text-xs text-white/70">{token?.name}</span>
            </div>
            {token?.address && (
              <ExternalLink
                href={`${getExplorerUrl(networks.sourceChain.id)}/token/${
                  token?.address
                }`}
                className="arb-hover text-xs underline"
              >
                {shortenAddress(token.address.toLowerCase())}
              </ExternalLink>
            )}
          </div>
        </div>

        <Checkbox
          label={
            <div className="max-w-[600px]">
              <span className="text-sm font-light">
                I understand that I have to{' '}
                <span className="font-medium">pay a one-time approval fee</span>{' '}
                of <span className="font-medium">{ethFeeText}</span>{' '}
                {usdFeeText} for each new token or spending cap.
              </span>
            </div>
          }
          checked={checked}
          onChange={setChecked}
        />

        <div className="text-sm">
          This transaction gives permission to the{' '}
          <ExternalLink
            className="arb-hover underline"
            href={`${getExplorerUrl(chainId)}/address/${contractAddress}`}
            onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
              event.stopPropagation()
            }}
          >
            {shortenTxHash(contractAddress)}
          </ExternalLink>{' '}
          contract to transfer a capped amount of{' '}
          {token?.symbol ?? 'a specific token'}.
        </div>

        <div className="flex flex-col">
          <div className="flex flex-row items-center space-x-1 rounded bg-cyan p-2">
            <InformationCircleIcon className="h-3 w-3 text-cyan-dark" />
            <span className="w-full text-xs font-medium text-cyan-dark">
              After approval, you&apos;ll see a second prompt in your wallet for
              the {isDepositMode ? 'deposit' : 'withdrawal'} transaction.
              <ExternalLink
                href={TOKEN_APPROVAL_ARTICLE_LINK}
                className="arb-hover ml-1 font-light underline"
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
