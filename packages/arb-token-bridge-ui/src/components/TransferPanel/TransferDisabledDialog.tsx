import { useEffect, useMemo, useState } from 'react'

import { Dialog } from '../common/Dialog'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { ExternalLink } from '../common/ExternalLink'
import { getNetworkName } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { getL2ConfigForTeleport } from '../../token-bridge-sdk/teleport'
import { withdrawOnlyTokens } from '../../util/WithdrawOnlyUtils'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly'
import { getTransferMode } from '../../util/getTransferMode'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { isTeleportEnabledToken } from '../../util/TokenTeleportEnabledUtils'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export function TransferDisabledDialog() {
  const [networks] = useNetworks()
  const { parentChain, childChain } = useNetworksRelationship(networks)
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
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
      if (transferMode !== 'teleport') {
        return
      }
      const { l2ChainId } = await getL2ConfigForTeleport({
        destinationChainProvider: networks.destinationChainProvider
      })
      setL2ChainIdForTeleport(l2ChainId)
    }
    updateL2ChainIdForTeleport()
  }, [transferMode, networks.destinationChainProvider])

  const shouldShowDialog = useMemo(() => {
    if (
      !selectedToken ||
      selectedToken.address === selectedTokenAddressLocalValue
    ) {
      return false
    }

    if (isTransferDisabledToken(selectedToken.address, childChain.id)) {
      return true
    }

    if (
      transferMode === 'teleport' &&
      !isTeleportEnabledToken(
        selectedToken.address,
        parentChain.id,
        childChain.id
      )
    ) {
      return true
    }

    if (
      (transferMode === 'deposit' || transferMode === 'teleport') &&
      isSelectedTokenWithdrawOnly &&
      !isSelectedTokenWithdrawOnlyLoading
    ) {
      return true
    }

    return false
  }, [
    childChain.id,
    transferMode,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
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
    networks.destinationChain.id === ChainId.ArbitrumOne &&
    selectedToken?.address.toLowerCase() ===
      withdrawOnlyTokens[ChainId.ArbitrumOne]
        ?.find(_token => _token.symbol === 'GHO')
        ?.l1Address.toLowerCase()

  useEffect(() => {
    if (
      selectedTokenAddressLocalValue &&
      (!selectedToken ||
        selectedToken.address !== selectedTokenAddressLocalValue)
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
        {transferMode === 'teleport' ? (
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
