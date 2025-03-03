import { useCallback, useEffect, useRef, useState } from 'react'
import { useLatest } from 'react-use'

import { TokenApprovalDialog } from '../TransferPanel/TokenApprovalDialog'
import { useIsOftV2Transfer } from '../TransferPanel/hooks/useIsOftV2Transfer'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { WithdrawalConfirmationDialog } from '../TransferPanel/WithdrawalConfirmationDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { USDCWithdrawalConfirmationDialog } from '../TransferPanel/USDCWithdrawal/USDCWithdrawalConfirmationDialog'
import { USDCDepositConfirmationDialog } from '../TransferPanel/USDCDeposit/USDCDepositConfirmationDialog'
import { CustomFeeTokenApprovalDialog } from '../TransferPanel/CustomFeeTokenApprovalDialog'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { CustomDestinationAddressConfirmationDialog } from '../TransferPanel/CustomDestinationAddressConfirmationDialog'
import { TokenImportDialog } from '../TransferPanel/TokenImportDialog'
import { TokenDepositCheckDialog } from '../TransferPanel/TokenDepositCheckDialog'
import { OneNovaTransferDialog } from '../TransferPanel/OneNovaTransferDialog'
import { NetworkSelectionContainer } from './NetworkSelectionContainer'
/**
 * Returns a promise which resolves to an array [boolean, unknown] value,
 * `false` if the action was canceled and `true` if it was confirmed.
 * Second index contain any additional information
 */
type WaitForInputFunction = () => Promise<[boolean, unknown]>

/**
 * Opens the dialog and returns a function which can be called to retrieve a {@link WaitForInputFunction}.
 */
type OpenDialogFunction = (dialogType: DialogType) => WaitForInputFunction

/**
 * Returns an array containing {@link DialogProps} and {@link OpenDialogFunction}.
 */
type UseDialogResult = [DialogProps, OpenDialogFunction]

type DialogType =
  | 'approve_token'
  | 'approve_cctp_usdc'
  | 'approve_custom_fee_token'
  | 'import_token'
  | 'deposit_token_new_token'
  | 'deposit_token_user_added_token'
  | 'import_token'
  | 'withdraw'
  | 'withdraw_usdc'
  | 'deposit_usdc'
  | 'scw_custom_destination_address'
  | 'one_nova_transfer'
  | 'source_networks'
  | 'destination_networks'

export function useDialog2(): UseDialogResult {
  const resolveRef =
    useRef<
      (value: [boolean, unknown] | PromiseLike<[boolean, unknown]>) => void
    >()

  // Whether the dialog is currently open
  const [openedDialogType, setOpenedDialogType] = useState<DialogType | null>(
    null
  )

  const openDialog: OpenDialogFunction = useCallback(
    (dialogType: DialogType) => {
      setOpenedDialogType(dialogType)

      return () => {
        return new Promise(resolve => {
          resolveRef.current = resolve
        })
      }
    },
    []
  )

  const closeDialog = useCallback(
    (confirmed: boolean, onCloseData?: unknown) => {
      if (typeof resolveRef.current !== 'undefined') {
        resolveRef.current([confirmed, onCloseData])
      }

      setOpenedDialogType(null)
    },
    []
  )

  return [{ openedDialogType, onClose: closeDialog }, openDialog]
}

type DialogProps = {
  openedDialogType: DialogType | null
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
}

export function DialogWrapper(props: DialogProps) {
  const isOftTransfer = useIsOftV2Transfer()
  const [selectedToken, setSelectedToken] = useSelectedToken()
  const [{ amount, token: tokenFromSearchParams }] = useArbQueryParams()
  const [networks] = useNetworks()
  const latestNetworks = useLatest(networks)
  const {
    current: { childChainProvider }
  } = useLatest(useNetworksRelationship(latestNetworks.current))
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const [isOpen, setIsOpen] = useState(false)

  const { openedDialogType } = props
  const commonProps: DialogProps & { isOpen: boolean } = { ...props, isOpen }

  // By doing this we enable fade in transition when dialog opens.
  useEffect(() => {
    setIsOpen(openedDialogType !== null)
  }, [openedDialogType])

  switch (openedDialogType) {
    case 'approve_token':
    case 'approve_cctp_usdc':
      return (
        <TokenApprovalDialog
          {...commonProps}
          token={selectedToken}
          isCctp={openedDialogType === 'approve_cctp_usdc'}
          isOft={isOftTransfer}
        />
      )
    case 'import_token':
      return (
        <TokenImportDialog
          {...commonProps}
          onClose={imported => {
            if (imported && tokenFromSearchParams) {
              setSelectedToken(tokenFromSearchParams)
            } else {
              setSelectedToken(null)
            }
            commonProps.onClose(imported)
          }}
          tokenAddress={tokenFromSearchParams!}
        />
      )
    case 'deposit_token_new_token':
    case 'deposit_token_user_added_token':
      return (
        <TokenDepositCheckDialog
          {...commonProps}
          type={openedDialogType}
          symbol={selectedToken ? selectedToken.symbol : nativeCurrency.symbol}
        />
      )
    case 'approve_custom_fee_token':
      if (nativeCurrency.isCustom) {
        return (
          <CustomFeeTokenApprovalDialog
            {...commonProps}
            customFeeToken={nativeCurrency}
          />
        )
      }
      return null
    case 'withdraw':
      return <WithdrawalConfirmationDialog {...commonProps} amount={amount} />
    case 'withdraw_usdc':
      return (
        <USDCWithdrawalConfirmationDialog {...commonProps} amount={amount} />
      )
    case 'deposit_usdc':
      return <USDCDepositConfirmationDialog {...commonProps} amount={amount} />
    case 'scw_custom_destination_address':
      return <CustomDestinationAddressConfirmationDialog {...commonProps} />
    case 'one_nova_transfer':
      return <OneNovaTransferDialog {...commonProps} />
    case 'source_networks':
    case 'destination_networks':
      const type = openedDialogType === 'source_networks' ? 'source' : 'destination'
      return <NetworkSelectionContainer {...commonProps} type={type} />
    default:
      return null
  }
}
