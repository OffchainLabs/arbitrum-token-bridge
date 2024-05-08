import { create } from 'zustand'

import { useActions, useAppState } from '../../state'
import { Dialog } from '../common/Dialog'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useTeleportMode } from '../../hooks/useTeleportMode'
import { ExternalLink } from '../common/ExternalLink'

type TransferDisabledDialogStore = {
  isOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

export const useTransferDisabledDialogStore =
  create<TransferDisabledDialogStore>(set => ({
    isOpen: false,
    openDialog: () => set({ isOpen: true }),
    closeDialog: () => set({ isOpen: false })
  }))

export function TransferDisabledDialog() {
  const [networks] = useNetworks()
  const { app } = useAppState()
  const { selectedToken } = app
  const {
    app: { setSelectedToken }
  } = useActions()
  const {
    isOpen: isOpenTransferDisabledDialog,
    closeDialog: closeTransferDisabledDialog
  } = useTransferDisabledDialogStore()
  const unsupportedToken = sanitizeTokenSymbol(selectedToken?.symbol ?? '', {
    erc20L1Address: selectedToken?.address,
    chainId: networks.sourceChain.id
  })

  const isTeleportMode = useTeleportMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  const onClose = () => {
    setSelectedToken(null)
    closeTransferDisabledDialog()
  }

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
        {/* teleport transfer disabled content if token is not in the allowlist */}
        {isTeleportMode ? (
          <>
            <p>
              Unfortunately,{' '}
              <span className="font-medium">{unsupportedToken}</span> is not
              supported for LayerLeap transfers yet.
            </p>
            <p>
              For more information please contact{' '}
              <ExternalLink
                href="https://discord.com/invite/ZpZuw7p"
                className="underline"
              >
                Discord
              </ExternalLink>{' '}
              and reach out in #support for assistance..
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
