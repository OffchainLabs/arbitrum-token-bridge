import { useEffect, useMemo, useState } from 'react'

import { Dialog } from '../common/Dialog'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { ExternalLink } from '../common/ExternalLink'
import { getNetworkName } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { getL2ConfigForTeleport } from '../../token-bridge-sdk/teleport'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { withdrawOnlyTokens } from '../../util/WithdrawOnlyUtils'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { isTeleportEnabledToken } from '../../util/TokenTeleportEnabledUtils'
import { addressesEqual } from '../../util/AddressUtils'
import { isValidLifiTransfer } from '../../app/api/crosschain-transfers/utils'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { isLifiEnabled } from '../../util/featureFlag'
import { CommonAddress } from '../../util/CommonAddressUtils'

export function isDisabledCanonicalTransfer({
  selectedToken,
  isDepositMode,
  isTeleportMode,
  parentChainId,
  childChainId,
  isSelectedTokenWithdrawOnly,
  isSelectedTokenWithdrawOnlyLoading
}: {
  selectedToken: ERC20BridgeToken | null
  isDepositMode: boolean
  isTeleportMode: boolean
  parentChainId: ChainId
  childChainId: ChainId
  isSelectedTokenWithdrawOnly: boolean | undefined
  isSelectedTokenWithdrawOnlyLoading: boolean
}) {
  if (!selectedToken) {
    return false
  }

  if (isTransferDisabledToken(selectedToken.address, childChainId)) {
    return true
  }

  if (
    isTeleportMode &&
    !isTeleportEnabledToken(selectedToken.address, parentChainId, childChainId)
  ) {
    return true
  }

  if (parentChainId === ChainId.ArbitrumOne) {
    if (
      childChainId === ChainId.ApeChain &&
      !addressesEqual(selectedToken.address, CommonAddress.ArbitrumOne.USDC)
    ) {
      return true
    }

    if (
      childChainId === ChainId.Superposition &&
      !addressesEqual(selectedToken.address, CommonAddress.ArbitrumOne.USDT) &&
      !addressesEqual(selectedToken.address, CommonAddress.ArbitrumOne.USDC)
    ) {
      return true
    }
  }

  if (
    isDepositMode &&
    isSelectedTokenWithdrawOnly &&
    !isSelectedTokenWithdrawOnlyLoading
  ) {
    return true
  }

  return false
}

export function TransferDisabledDialog() {
  const [networks] = useNetworks()
  const { isDepositMode, isTeleportMode, parentChain, childChain } =
    useNetworksRelationship(networks)
  const [selectedToken, setSelectedToken] = useSelectedToken()
  // for tracking local state and prevent flickering with async URL params updating
  const [selectedTokenAddressLocalValue, setSelectedTokenAddressLocalValue] =
    useState<string | null>(null)
  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly()
  const unsupportedToken = sanitizeTokenSymbol(selectedToken?.symbol ?? '', {
    erc20L1Address: selectedToken?.address,
    chainId: networks.sourceChain.id
  })
  const [l2ChainIdForTeleport, setL2ChainIdForTeleport] = useState<
    number | undefined
  >()

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

  const shouldShowDialog = useMemo(() => {
    if (
      !selectedToken ||
      addressesEqual(
        selectedToken?.address,
        selectedTokenAddressLocalValue ?? undefined
      )
    ) {
      return false
    }

    // If a lifi route exists, don't show any dialog
    if (
      isLifiEnabled() &&
      isValidLifiTransfer({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        fromToken: isDepositMode
          ? selectedToken.address
          : selectedToken.l2Address
      })
    ) {
      return false
    }

    return isDisabledCanonicalTransfer({
      selectedToken,
      isDepositMode,
      isTeleportMode,
      parentChainId: parentChain.id,
      childChainId: childChain.id,
      isSelectedTokenWithdrawOnly,
      isSelectedTokenWithdrawOnlyLoading
    })
  }, [
    childChain.id,
    isDepositMode,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    isTeleportMode,
    parentChain.id,
    selectedToken,
    selectedTokenAddressLocalValue
  ])

  const sourceChainName = getNetworkName(networks.sourceChain.id)
  const destinationChainName = getNetworkName(networks.destinationChain.id)
  const l2ChainIdForTeleportName = l2ChainIdForTeleport
    ? getNetworkName(l2ChainIdForTeleport)
    : null

  const isGHO =
    selectedToken &&
    networks.destinationChain.id === ChainId.ArbitrumOne &&
    addressesEqual(
      selectedToken.address,
      withdrawOnlyTokens[ChainId.ArbitrumOne]?.find(
        _token => _token.symbol === 'GHO'
      )?.l1Address
    )

  useEffect(() => {
    if (
      selectedTokenAddressLocalValue &&
      (!selectedToken ||
        !addressesEqual(selectedToken.address, selectedTokenAddressLocalValue))
    ) {
      setSelectedTokenAddressLocalValue(null)
    }
  }, [selectedToken, selectedTokenAddressLocalValue])

  const onClose = () => {
    if (selectedToken) {
      setSelectedTokenAddressLocalValue(selectedToken.address)
      setSelectedToken(null)
    }
  }

  return (
    <Dialog
      closeable
      title="Token cannot be bridged here"
      cancelButtonProps={{ className: 'hidden' }}
      actionButtonTitle="Close"
      isOpen={shouldShowDialog}
      onClose={onClose}
    >
      <div className="flex flex-col space-y-4 py-4">
        {isTeleportMode ? (
          // teleport transfer disabled content if token is not in the allowlist
          <>
            <p>
              Unfortunately,{' '}
              <span className="font-medium">{unsupportedToken}</span> is not yet
              supported for direct {sourceChainName} to {destinationChainName}{' '}
              transfers.
            </p>
            {l2ChainIdForTeleportName && (
              <p>
                To bridge{' '}
                <span className="font-medium">{unsupportedToken}</span>:
                <li>
                  First bridge from {sourceChainName} to{' '}
                  {l2ChainIdForTeleportName}.
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
        ) : (
          // canonical transfer disabled content for all other cases
          <>
            <p>
              Unfortunately,{' '}
              <span className="font-medium">{unsupportedToken}</span> has a
              custom bridge solution that is incompatible with the canonical
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
        )}
      </div>
    </Dialog>
  )
}
