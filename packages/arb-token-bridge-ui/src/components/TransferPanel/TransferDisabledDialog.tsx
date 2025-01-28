import { create } from 'zustand'
import { useEffect, useMemo, useState } from 'react'

import { useActions, useAppState } from '../../state'
import { Dialog } from '../common/Dialog'
import { isTokenUSDT, sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { ExternalLink } from '../common/ExternalLink'
import { getNetworkName } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { getL2ConfigForTeleport } from '../../token-bridge-sdk/teleport'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { withdrawOnlyTokens } from '../../util/WithdrawOnlyUtils'
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly'

type TransferDisabledDialogStore = {
  isOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

const generateTransferDisabledContent = ({
  sourceChainName,
  destinationChainName,
  isTeleportMode,
  unsupportedToken,
  l2ChainIdForTeleportName,
  isGHO,
  isUsdtTransfer
}: {
  sourceChainName: string
  destinationChainName: string
  isTeleportMode: boolean
  unsupportedToken: string
  l2ChainIdForTeleportName: string | null
  isGHO: boolean
  isUsdtTransfer: boolean
}) => {
  // OFT migration message
  if (isUsdtTransfer) {
    return (
      <>
        <p>
          USDT is currently undergoing an upgrade to USDT0. We are working to
          provide official support on this page soon.
          <p>
            Until then, we encourage you to initiate USDT transfers{' '}
            <ExternalLink
              href="https://usdt0.to/transfer"
              className="underline"
            >
              here
            </ExternalLink>
            .
          </p>
        </p>
        <p>
          Read more about the upgrade{' '}
          <ExternalLink
            href="https://x.com/USDT0_to/status/1884266492797342207"
            className="underline"
          >
            here
          </ExternalLink>
          . If you have any questions or need assistance, please feel free to
          reach out to us on{' '}
          <ExternalLink
            href="https://discord.com/invite/ZpZuw7p"
            className="underline"
          >
            Discord
          </ExternalLink>{' '}
          and connect with our support team in #support.
        </p>
      </>
    )
  }

  // teleport transfer disabled content if token is not in the allowlist
  if (isTeleportMode) {
    return (
      <>
        <p>
          Unfortunately, <span className="font-medium">{unsupportedToken}</span>{' '}
          is not yet supported for direct {sourceChainName} to{' '}
          {destinationChainName} transfers.
        </p>
        {l2ChainIdForTeleportName && (
          <p>
            To bridge <span className="font-medium">{unsupportedToken}</span>:
            <li>
              First bridge from {sourceChainName} to {l2ChainIdForTeleportName}.
            </li>
            <li>
              Then bridge from {l2ChainIdForTeleportName} to{' '}
              {destinationChainName}.
            </li>
          </p>
        )}
        <p>
          For more information please contact us on{' '}
          <ExternalLink
            href="https://discord.com/invite/ZpZuw7p"
            className="underline"
          >
            Discord
          </ExternalLink>{' '}
          and reach out in #support for assistance.
        </p>
      </>
    )
  }

  // canonical transfer disabled content for all other cases
  return (
    <>
      <p>
        Unfortunately, <span className="font-medium">{unsupportedToken}</span>{' '}
        has a custom bridge solution that is incompatible with the canonical
        Arbitrum bridge.
      </p>
      {isGHO && (
        <p>
          Please use the{' '}
          <ExternalLink
            className="underline hover:opacity-70"
            href="https://app.transporter.io/?from=mainnet&tab=token&to=arbitrum&token=GHO"
          >
            CCIP bridge for GHO
          </ExternalLink>{' '}
          instead.
        </p>
      )}
      <p>
        For more information please contact{' '}
        <span className="font-medium">{unsupportedToken}</span>
        &apos;s developer team directly or explore their docs.
      </p>
    </>
  )
}

export const useTransferDisabledDialogStore =
  create<TransferDisabledDialogStore>(set => ({
    isOpen: false,
    openDialog: () => set({ isOpen: true }),
    closeDialog: () => set({ isOpen: false })
  }))

export function TransferDisabledDialog() {
  const [networks] = useNetworks()
  const { isDepositMode, isTeleportMode } = useNetworksRelationship(networks)
  const { app } = useAppState()
  const { selectedToken } = app
  const {
    app: { setSelectedToken }
  } = useActions()
  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly()
  const {
    isOpen: isOpenTransferDisabledDialog,
    openDialog: openTransferDisabledDialog,
    closeDialog: closeTransferDisabledDialog
  } = useTransferDisabledDialogStore()
  const unsupportedToken = sanitizeTokenSymbol(selectedToken?.symbol ?? '', {
    erc20L1Address: selectedToken?.address,
    chainId: networks.sourceChain.id
  })
  const [l2ChainIdForTeleport, setL2ChainIdForTeleport] = useState<
    number | undefined
  >()

  const isUsdtTransfer = useMemo(() => {
    return isTokenUSDT(selectedToken?.address)
  }, [selectedToken?.address])

  useEffect(() => {
    const updateL2ChainIdForTeleport = async () => {
      if (!isTeleportMode) {
        return
      }
      const { l2ChainId } = await getL2ConfigForTeleport({
        destinationChainProvider: networks.destinationChainProvider
      })
      setL2ChainIdForTeleport(l2ChainId)
    }
    updateL2ChainIdForTeleport()
  }, [isTeleportMode, networks.destinationChainProvider])

  useEffect(() => {
    // do not allow import of withdraw-only tokens at deposit mode
    if (
      isDepositMode &&
      isSelectedTokenWithdrawOnly &&
      !isSelectedTokenWithdrawOnlyLoading
    ) {
      openTransferDisabledDialog()
    }
  }, [
    isSelectedTokenWithdrawOnly,
    isDepositMode,
    openTransferDisabledDialog,
    isSelectedTokenWithdrawOnlyLoading
  ])

  const onClose = () => {
    setSelectedToken(null)
    closeTransferDisabledDialog()
  }

  const sourceChainName = getNetworkName(networks.sourceChain.id)
  const destinationChainName = getNetworkName(networks.destinationChain.id)
  const l2ChainIdForTeleportName = l2ChainIdForTeleport
    ? getNetworkName(l2ChainIdForTeleport)
    : null

  const isGHO =
    networks.destinationChain.id === ChainId.ArbitrumOne &&
    selectedToken?.address.toLowerCase() ===
      withdrawOnlyTokens[ChainId.ArbitrumOne]
        ?.find(_token => _token.symbol === 'GHO')
        ?.l1Address.toLowerCase()

  return (
    <Dialog
      closeable
      title="Token cannot be bridged here"
      cancelButtonProps={{ className: 'hidden' }}
      actionButtonTitle="Close"
      isOpen={isOpenTransferDisabledDialog}
      onClose={onClose}
    >
      <div className="flex flex-col space-y-4 py-4">
        {generateTransferDisabledContent({
          sourceChainName,
          destinationChainName,
          isTeleportMode,
          unsupportedToken,
          l2ChainIdForTeleportName,
          isGHO,
          isUsdtTransfer
        })}
      </div>
    </Dialog>
  )
}
