import { useCallback, useEffect, useRef, useState } from 'react'

import { TokenApprovalDialog } from '../TransferPanel/TokenApprovalDialog'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { WithdrawalConfirmationDialog } from '../TransferPanel/WithdrawalConfirmationDialog'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { CustomFeeTokenApprovalDialog } from '../TransferPanel/CustomFeeTokenApprovalDialog'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { CustomDestinationAddressConfirmationDialog } from '../TransferPanel/CustomDestinationAddressConfirmationDialog'
import { CctpUsdcWithdrawalConfirmationDialog } from '../TransferPanel/USDCWithdrawal/CctpUsdcWithdrawalConfirmationDialog'
import { CctpUsdcDepositConfirmationDialog } from '../TransferPanel/USDCDeposit/CctpUsdcDepositConfirmationDialog'
import { UsdcDepositConfirmationDialog } from '../TransferPanel/USDCDeposit/UsdcDepositConfirmationDialog'
import { TokenDepositCheckDialog } from '../TransferPanel/TokenDepositCheckDialog'
import { HighSlippageWarningDialog } from '../TransferPanel/HighSlippageWarningDialog'
import { WidgetTransactionHistory } from '../Widget/WidgetTransactionHistory'
import { TokenSearch } from '../TransferPanel/TokenSearch'
import { SettingsDialog } from '../TransferPanel/SettingsDialog'
import { RecoverFundsDialog } from '../RecoverFunds'
/**
 * Returns a promise which resolves to an array [boolean, unknown] value,
 * `false` if the action was canceled and `true` if it was confirmed.
 * Second index contain any additional information
 */
type WaitForInputFunction = () => Promise<[boolean, unknown]>

/**
 * Opens the dialog and returns a function which can be called to retrieve a {@link WaitForInputFunction}.
 */
export type OpenDialogFunction = (
  dialogType: DialogType
) => WaitForInputFunction

/**
 * Returns an array containing {@link DialogProps} and {@link OpenDialogFunction}.
 */
type UseDialogResult = [DialogProps, OpenDialogFunction]

export type DialogType =
  | 'approve_token'
  | 'approve_cctp_usdc'
  | 'approve_custom_fee_token'
  | 'withdraw'
  | 'deposit_token_new_token'
  | 'deposit_token_user_added_token'
  | 'scw_custom_destination_address'
  | 'confirm_cctp_withdrawal'
  | 'confirm_cctp_deposit'
  | 'confirm_usdc_deposit'
  | 'high_slippage_warning'
  | 'widget_transaction_history'
  | 'token_selection'
  | 'settings'
  | 'recover_funds'

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

export type DialogProps = {
  openedDialogType: DialogType | null
  onClose: (confirmed: boolean, onCloseData?: unknown) => void
}

export function DialogWrapper(props: DialogProps) {
  const [selectedToken] = useSelectedToken()
  const [{ amount }] = useArbQueryParams()
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
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
      return <TokenApprovalDialog {...commonProps} token={selectedToken} />
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
    case 'scw_custom_destination_address':
      return <CustomDestinationAddressConfirmationDialog {...commonProps} />
    case 'confirm_cctp_withdrawal':
      return <CctpUsdcWithdrawalConfirmationDialog {...commonProps} />
    case 'confirm_cctp_deposit':
      return <CctpUsdcDepositConfirmationDialog {...commonProps} />
    case 'confirm_usdc_deposit':
      return <UsdcDepositConfirmationDialog {...commonProps} />
    case 'deposit_token_new_token':
    case 'deposit_token_user_added_token':
      return (
        <TokenDepositCheckDialog
          {...commonProps}
          type={openedDialogType}
          symbol={selectedToken ? selectedToken.symbol : nativeCurrency.symbol}
        />
      )
    case 'high_slippage_warning':
      return <HighSlippageWarningDialog {...commonProps} />
    case 'widget_transaction_history':
      return <WidgetTransactionHistory {...commonProps} />
    case 'token_selection':
      return <TokenSearch {...commonProps} />
    case 'settings':
      return <SettingsDialog {...commonProps} />
    case 'recover_funds':
      return <RecoverFundsDialog {...commonProps} />
    default:
      return null
  }
}
