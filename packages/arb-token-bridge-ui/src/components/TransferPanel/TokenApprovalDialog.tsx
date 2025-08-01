import { useCallback, useEffect, useMemo, useState } from 'react'
import { BigNumber, constants, utils } from 'ethers'
import { useAccount, useChainId } from 'wagmi'

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
import { getCctpContracts } from '@/token-bridge-sdk/cctp'
import {
  fetchErc20L2GatewayAddress,
  fetchErc20ParentChainGatewayAddress
} from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getBridger } from '@/token-bridge-sdk/utils'
import { Erc20L1L3Bridger } from '@arbitrum/sdk'
import { shortenTxHash } from '../../util/CommonUtils'
import { TokenInfo } from './TokenInfo'
import { NoteBox } from '../common/NoteBox'
import { useEthersSigner } from '../../util/wagmi/useEthersSigner'
import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter'
import { getOftV2TransferConfig } from '../../token-bridge-sdk/oftUtils'
import { isLifiRoute, useRouteStore } from './hooks/useRouteStore'
import { LifiTransferStarter } from '@/token-bridge-sdk/LifiTransferStarter'
import { shallow } from 'zustand/shallow'

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { address: walletAddress } = useAccount()
  const { isOpen, token, onClose } = props

  const { ethToUSD } = useETHPrice()

  const [networks] = useNetworks()
  const {
    sourceChain,
    destinationChain,
    sourceChainProvider,
    destinationChainProvider
  } = networks
  const {
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode,
    isTeleportMode
  } = useNetworksRelationship(networks)
  const { isEthereumMainnet, isTestnet } = isNetwork(parentChain.id)
  const provider = isDepositMode ? parentChainProvider : childChainProvider
  const gasPrice = useGasPrice({ provider })
  const chainId = useChainId()
  const signer = useEthersSigner({ chainId })
  const { selectedRoute, context } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      context: state.context
    }),
    shallow
  )
  const isCctp = selectedRoute === 'cctp'
  const isLifi = isLifiRoute(selectedRoute)
  const isOft = selectedRoute === 'oftV2'

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

  const approvalFeeText = `${ethFeeText} ${usdFeeText}`.trim()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    async function getEstimatedGas() {
      if (!token?.address) {
        return
      }

      let gasEstimate

      if (!signer) {
        gasEstimate = constants.Zero
      } else if (isLifi) {
        if (!context) {
          throw new Error('Missing context data for Lifi transfer.')
        }
        const lifiTransferStarter = new LifiTransferStarter({
          sourceChainProvider,
          destinationChainProvider,
          lifiData: context,
          sourceChainErc20Address: token.address
        })
        gasEstimate = await lifiTransferStarter.approveTokenEstimateGas({
          signer,
          amount: constants.MaxUint256
        })
      } else if (isCctp) {
        const cctpTransferStarter = new CctpTransferStarter({
          sourceChainProvider,
          destinationChainProvider
        })
        gasEstimate = await cctpTransferStarter.approveTokenEstimateGas({
          amount: constants.MaxUint256,
          signer
        })
      } else if (isOft) {
        const oftTransferStarter = new OftV2TransferStarter({
          sourceChainProvider,
          destinationChainProvider,
          sourceChainErc20Address: isDepositMode
            ? token.address
            : token.l2Address
        })
        gasEstimate = await oftTransferStarter.approveTokenEstimateGas({
          amount: constants.MaxUint256,
          signer
        })
      } else {
        const bridgeTransferStarter = BridgeTransferStarterFactory.create({
          sourceChainId: sourceChain.id,
          sourceChainErc20Address: isDepositMode
            ? token.address
            : token.l2Address,
          destinationChainId: destinationChain.id,
          destinationChainErc20Address: isDepositMode
            ? token.l2Address
            : token.address
        })

        gasEstimate = await bridgeTransferStarter.approveTokenEstimateGas({
          signer
        })
      }

      if (gasEstimate) {
        setEstimatedGas(gasEstimate)
      }
    }

    getEstimatedGas()
  }, [
    isOpen,
    isDepositMode,
    isTestnet,
    signer,
    walletAddress,
    token?.address,
    token?.l2Address,
    sourceChain,
    sourceChainProvider,
    destinationChain,
    destinationChainProvider,
    chainId,
    isCctp,
    isOft,
    isLifi,
    context
  ])

  useEffect(() => {
    const getContractAddress = async function () {
      if (isLifi) {
        if (!context) {
          throw new Error('Missing context data for Lifi transfer.')
        }

        setContractAddress(context.spenderAddress)
        return
      }

      if (isOft) {
        const oftTransferConfig = getOftV2TransferConfig({
          sourceChainId: sourceChain.id,
          destinationChainId: destinationChain.id,
          sourceChainErc20Address: isDepositMode
            ? token?.address
            : token?.l2Address
        })

        if (!oftTransferConfig.isValid) {
          throw new Error('OFT transfer validation failed')
        }

        setContractAddress(oftTransferConfig.sourceChainAdapterAddress)
        return
      }
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

      if (isTeleportMode) {
        const l1L3Bridger = await getBridger({
          sourceChainId: sourceChain.id,
          destinationChainId: destinationChain.id
        })

        if (!(l1L3Bridger instanceof Erc20L1L3Bridger)) {
          throw new Error('Error initializing L1L3Bridger.')
        }

        setContractAddress(l1L3Bridger.teleporter.l1Teleporter)
        return
      }

      if (isDepositMode) {
        setContractAddress(
          await fetchErc20ParentChainGatewayAddress({
            erc20ParentChainAddress: token.address,
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
    token?.address,
    token?.l2Address,
    sourceChain.id,
    destinationChain.id,
    isTeleportMode,
    isOft,
    isLifi,
    context
  ])

  const closeWithReset = useCallback(
    (confirmed: boolean) => {
      onClose(confirmed)
      setChecked(false)
    },
    [onClose]
  )

  useEffect(() => {
    if (isLifi && !context) {
      closeWithReset(false)
    }
  }, [context, closeWithReset, isLifi])

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Acknowledge approval and deposit fees"
      actionButtonTitle={`Pay approval fee of ${approvalFeeText}`}
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <TokenInfo token={token} />
        <Checkbox
          label={
            <div>
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

        <div className="flex flex-col gap-2">
          {isOft && (
            <NoteBox variant="warning">
              Note: USDT approvals for the LayerZero OFT contract must be set to
              the maximum amount. Please do not modify the approval amount, or
              the transaction may fail.
            </NoteBox>
          )}

          <NoteBox>
            After approval, you&apos;ll see a second prompt in your wallet for
            the {isDepositMode ? 'deposit' : 'withdrawal'} transaction.
            <ExternalLink
              href={TOKEN_APPROVAL_ARTICLE_LINK}
              className="arb-hover ml-1 underline"
            >
              Learn more.
            </ExternalLink>
          </NoteBox>
        </div>
      </div>
    </Dialog>
  )
}
