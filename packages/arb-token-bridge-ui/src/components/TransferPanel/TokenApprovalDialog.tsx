import { useEffect, useMemo, useState } from 'react'
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
import { getCctpContracts } from '@/token-bridge-sdk/cctp'
import {
  fetchErc20L2GatewayAddress,
  fetchErc20ParentChainGatewayAddress
} from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { shortenTxHash } from '../../util/CommonUtils'
import { TokenInfo } from './TokenInfo'
import { NoteBox } from '../common/NoteBox'

export type TokenApprovalDialogProps = UseDialogProps & {
  token: ERC20BridgeToken | null
  isCctp: boolean
}

export function TokenApprovalDialog(props: TokenApprovalDialogProps) {
  const { address: walletAddress } = useAccount()
  const { isOpen, token, isCctp } = props

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
      } else if (isCctp) {
        const cctpTransferStarter = new CctpTransferStarter({
          sourceChainProvider,
          destinationChainProvider
        })
        gasEstimate = await cctpTransferStarter.approveTokenEstimateGas({
          amount: constants.MaxUint256,
          signer
        })
      } else {
        const bridgeTransferStarter = await BridgeTransferStarterFactory.create(
          {
            sourceChainId: sourceChain.id,
            sourceChainErc20Address: isDepositMode
              ? token.address
              : token.l2Address,
            destinationChainId: destinationChain.id,
            destinationChainErc20Address: isDepositMode
              ? token.l2Address
              : token.address
          }
        )

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
    isCctp,
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

        <div className="flex flex-col">
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
