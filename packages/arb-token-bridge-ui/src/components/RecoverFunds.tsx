import {
  Address,
  EthBridger,
  getArbitrumNetwork,
  ParentToChildMessageGasEstimator,
  ParentTransactionReceipt
} from '@arbitrum/sdk'
import useSWRImmutable from 'swr/immutable'
import {
  getNetworkName,
  getSupportedChainIds,
  isNetwork
} from '../util/networks'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { BigNumber, constants, Signer } from 'ethers'
import { useNetworks } from '../hooks/useNetworks'
import { useAccount } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'
import { fetchNativeCurrency, NativeCurrency } from '../hooks/useNativeCurrency'
import { ChainId } from '../types/ChainId'
import { formatAmount } from '../util/NumberUtils'
import { isAddress, parseEther } from 'ethers/lib/utils'
import { errorToast } from './common/atoms/Toast'
import { getBaseFee } from '@arbitrum/sdk/dist/lib/utils/lib'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory'
import { ERC20Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20Inbox__factory'
import { ParentToChildMessageGasParams } from '@arbitrum/sdk/dist/lib/message/ParentToChildMessageCreator'
import { Button } from './common/Button'
import { getInboxAddressFromOrbitChainId } from '../util/orbitChainsList'
import { useEthersSigner } from '../util/wagmi/useEthersSigner'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { useError } from '../hooks/useError'
import { Column, Table, TableCellRenderer } from 'react-virtualized'
import { DialogWrapper, useDialog2 } from './common/Dialog2'
import { Dialog, UseDialogProps } from './common/Dialog'
import { SafeImage } from './common/SafeImage'
import { NetworkImage } from './common/NetworkImage'
import { twMerge } from 'tailwind-merge'
import { Loader } from './common/atoms/Loader'
import { NoteBox } from './common/NoteBox'
import { trackEvent } from '../util/AnalyticsUtils'
import { shortenAddress } from '../util/CommonUtils'
import { Tooltip } from './common/Tooltip'
import { TokenLogoFallback } from './TransferPanel/TokenInfo'
import { addressesEqual } from '../util/AddressUtils'
import { useSwitchNetworkWithConfig } from '../hooks/useSwitchNetworkWithConfig'
import { useLatest } from 'react-use'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

async function createRetryableTicket({
  inboxAddress,
  childProvider,
  signer,
  destinationAddress,
  l2CallValue,
  gasEstimation,
  signerAddress
}: {
  inboxAddress: string
  childProvider: StaticJsonRpcProvider
  signer: Signer
  destinationAddress: string
  l2CallValue: BigNumber
  gasEstimation: ParentToChildMessageGasParams
  signerAddress: string
}) {
  const { nativeToken } = await EthBridger.fromProvider(childProvider)

  if (
    typeof nativeToken === 'undefined' ||
    addressesEqual(nativeToken, constants.AddressZero)
  ) {
    const inbox = Inbox__factory.connect(inboxAddress, childProvider)
    return await inbox.connect(signer).unsafeCreateRetryableTicket(
      destinationAddress, // to
      l2CallValue, // l2CallValue
      gasEstimation.maxSubmissionCost, // maxSubmissionCost
      destinationAddress, // excessFeeRefundAddress
      destinationAddress, // callValueRefundAddress
      gasEstimation.gasLimit, // gasLimit
      gasEstimation.maxFeePerGas, // maxFeePerGas
      '0x', // data
      {
        from: signerAddress,
        value: 0
      }
    )
  }

  const inbox = ERC20Inbox__factory.connect(inboxAddress, childProvider)
  // And we send the request through the method unsafeCreateRetryableTicket of the Inbox contract
  // We need this method because we don't want the contract to check that we are not sending the l2CallValue
  // in the "value" of the transaction, because we want to use the amount that is already on child chain
  return await inbox.connect(signer).unsafeCreateRetryableTicket(
    destinationAddress, // to
    l2CallValue, // l2CallValue
    gasEstimation.maxSubmissionCost, // maxSubmissionCost
    destinationAddress, // excessFeeRefundAddress
    destinationAddress, // callValueRefundAddress
    gasEstimation.gasLimit, // gasLimit
    gasEstimation.maxFeePerGas, // maxFeePerGas
    0, // tokenTotalFeeAmount
    '0x', // data
    {
      from: signerAddress
    }
  )
}

async function prepareTransaction({
  address,
  destinationAddress,
  childProvider,
  parentProvider,
  balanceToRecover
}: {
  address: string
  destinationAddress: string
  childProvider: StaticJsonRpcProvider
  parentProvider: StaticJsonRpcProvider
  balanceToRecover: BigNumber
}) {
  // We estimate gas usage
  const parentToChildMessageGasEstimator = new ParentToChildMessageGasEstimator(
    childProvider
  )
  const aliasedAddress = getAliasedAddress(address)

  const gasEstimation = await parentToChildMessageGasEstimator.estimateAll(
    {
      from: aliasedAddress,
      to: destinationAddress,
      l2CallValue: balanceToRecover,
      excessFeeRefundAddress: destinationAddress,
      callValueRefundAddress: destinationAddress,
      data: '0x'
    },
    await getBaseFee(parentProvider),
    parentProvider
  )

  const l2CallValue = balanceToRecover
    .sub(gasEstimation.maxSubmissionCost)
    .sub(gasEstimation.gasLimit.mul(gasEstimation.maxFeePerGas))

  return {
    l2CallValue,
    gasEstimation
  }
}

async function recoverFunds({
  address,
  destinationAddress,
  childProvider,
  parentProvider,
  balanceToRecover,
  inboxAddress,
  signer
}: {
  address: string
  destinationAddress: string
  childProvider: StaticJsonRpcProvider
  parentProvider: StaticJsonRpcProvider
  balanceToRecover: BigNumber
  inboxAddress: string
  signer: Signer
}) {
  const { gasEstimation, l2CallValue } = await prepareTransaction({
    address,
    destinationAddress,
    childProvider,
    parentProvider,
    balanceToRecover
  })

  return await createRetryableTicket({
    childProvider,
    destinationAddress,
    gasEstimation,
    inboxAddress,
    l2CallValue,
    signer,
    signerAddress: address
  })
}

export function getAliasedAddress(address: string) {
  return new Address(address).applyAlias().value
}

async function filterLostFundsWithoutEnoughGas({
  chainId,
  balance,
  address
}: {
  chainId: ChainId
  balance: BigNumber
  address: string
}) {
  if (balance.isZero()) {
    return constants.Zero
  }

  const childProvider = getProviderForChainId(chainId)
  const chain = getArbitrumNetwork(chainId)

  const parentProvider = getProviderForChainId(chain.parentChainId)
  const { l2CallValue } = await prepareTransaction({
    address,
    destinationAddress: getAliasedAddress(address),
    childProvider,
    parentProvider,
    balanceToRecover: balance
  })

  if (l2CallValue.isNegative()) {
    return constants.Zero
  }

  return balance
}

export function useFundsOnAliasedAddress({
  address,
  isTestnet
}: {
  address: string | undefined
  isTestnet: boolean
}) {
  return useSWRImmutable(
    address ? [address, isTestnet, 'useFundsOnAliasedAddress'] : null,
    async ([address, isTestnet]) => {
      const aliasedAddress = getAliasedAddress(address)
      const chainIds = getSupportedChainIds({
        includeTestnets: isTestnet,
        includeMainnets: !isTestnet
      }).filter(chainId => {
        const { isBase, isEthereumMainnetOrTestnet } = isNetwork(chainId)
        return !isBase && !isEthereumMainnetOrTestnet
      })

      const balancePromises = chainIds.map(async chainId => {
        const provider = getProviderForChainId(chainId)
        const nativeCurrency = await fetchNativeCurrency({ provider })

        try {
          const balance = await provider.getBalance(aliasedAddress)
          const balanceFiltered = await filterLostFundsWithoutEnoughGas({
            chainId,
            balance,
            address
          })
          return [chainId, balanceFiltered, nativeCurrency] as const
        } catch (error) {
          return [chainId, constants.Zero, nativeCurrency] as const
        }
      })

      const balances = await Promise.all(balancePromises)
      // Aliased account will always have some leftover, we can't check for balance of 0, as it would always return 0
      // We compare with 0.005 instead
      return balances.filter(([, balance]) => balance.gt(parseEther('0.005')))
    }
  )
}

const TokenColumn: TableCellRenderer = ({ rowData }) => {
  const [, balance, nativeCurrency] = rowData

  return (
    <span className="flex h-12 items-center align-middle">
      <SafeImage
        src={nativeCurrency.logoUrl}
        height={20}
        width={20}
        fallback={<TokenLogoFallback className="h4 w-4" />}
      />
      <span className="ml-1 text-xs">
        {formatAmount(balance, nativeCurrency)}
      </span>
    </span>
  )
}

export function RecoverFunds() {
  const { address } = useAccount()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { data: lostFunds } = useFundsOnAliasedAddress({
    address,
    isTestnet
  })
  const [dialogProps, openDialog] = useDialog2()

  if (!address || !lostFunds || lostFunds.length === 0) {
    return null
  }

  return (
    <>
      <DialogWrapper {...dialogProps} />
      <NoteBox className="m-auto w-[600px] sm:pt-6">
        <div className="flex items-center">
          <p>
            We detected some funds on{' '}
            <Tooltip
              wrapperClassName="inline arb-hover underline cursor-help"
              content={getAliasedAddress(address)}
              tippyProps={{
                hideOnClick: false
              }}
            >
              {shortenAddress(getAliasedAddress(address))}
            </Tooltip>{' '}
            alias of currently connected address (
            <Tooltip
              wrapperClassName="inline arb-hover underline cursor-help"
              content={address}
              tippyProps={{
                hideOnClick: false
              }}
            >
              {shortenAddress(address)}
            </Tooltip>
            )
          </p>

          <Button
            variant="primary"
            onClick={() => openDialog('recover_funds')}
            className="ml-1"
          >
            Recover funds
          </Button>
        </div>
      </NoteBox>
    </>
  )
}

type RecoverFundsTransactionsStore = {
  transactions: Record<string, Record<number, string>>
  addTransaction: (parameters: {
    walletAddress: string
    chainId: ChainId
    tx: string
  }) => void
  removeTransaction: (parameters: {
    walletAddress: string
    chainId: ChainId
  }) => void
}
export const useRecoverFundsTransactionsStore =
  create<RecoverFundsTransactionsStore>()(
    persist(
      set => ({
        transactions: {},
        addTransaction: ({ chainId, walletAddress, tx }) =>
          set(state => ({
            transactions: {
              [walletAddress]: {
                ...(state.transactions[walletAddress] || {}),
                [chainId]: tx
              }
            }
          })),
        removeTransaction: ({ chainId, walletAddress }) =>
          set(state => {
            const newState = { ...state }
            delete newState.transactions[walletAddress]?.[chainId]
            return newState
          })
      }),
      {
        name: 'recover-funds-transaction-cache',
        version: 1
      }
    )
  )

const ActionColumn: TableCellRenderer = ({ rowData }) => {
  const [chainId, balance]: [ChainId, BigNumber, NativeCurrency] = rowData
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [destinationAddress, setDestinationAddress] = useState<
    string | undefined
  >(undefined)
  const { handleError } = useError()
  const signer = useEthersSigner()
  const { current: latestSigner } = useLatest(signer)
  const childChainProvider = getProviderForChainId(chainId)
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { transactions, addTransaction, removeTransaction } =
    useRecoverFundsTransactionsStore(
      state => ({
        transactions: state.transactions,
        addTransaction: state.addTransaction,
        removeTransaction: state.removeTransaction
      }),
      shallow
    )
  const { mutate } = useFundsOnAliasedAddress({
    address,
    isTestnet
  })
  const { switchChainAsync } = useSwitchNetworkWithConfig()
  const parentChainProvider = useMemo(() => {
    const chain = getArbitrumNetwork(chainId)
    return getProviderForChainId(chain.parentChainId)
  }, [chainId])

  useEffect(() => {
    async function resumeTransaction() {
      try {
        if (!address) {
          return
        }
        const txHash = transactions[address]?.[chainId]
        if (!txHash) {
          return
        }

        // When transaction is pulled from localStorage, `wait` function has been removed due to JSON.stringify
        const provider = getProviderForChainId(
          getArbitrumNetwork(chainId).parentChainId
        )
        const tx = await provider.getTransaction(txHash)
        const parentSubmissionTx =
          ParentTransactionReceipt.monkeyPatchContractCallWait(tx)
        const parentSubmissionTxReceipt = await parentSubmissionTx.wait()
        await parentSubmissionTxReceipt.waitForChildTransactionReceipt(
          childChainProvider
        )
        // Refetch lists
        await mutate()
        removeTransaction({ walletAddress: address, chainId })
      } catch (error) {
        handleError({
          error,
          label: 'recover_funds',
          category: 'contract_interaction'
        })
        errorToast(
          `Recover funds transaction failed: ${
            (error as Error)?.message ?? error
          }`
        )
      } finally {
        setIsLoading(false)
      }
    }

    resumeTransaction()
  }, [
    transactions,
    address,
    chainId,
    childChainProvider,
    mutate,
    removeTransaction,
    setIsLoading,
    handleError
  ])

  if (!address) {
    return null
  }

  const inboxAddress = isNetwork(chainId).isOrbitChain
    ? getInboxAddressFromOrbitChainId(chainId)
    : getArbitrumNetwork(chainId).ethBridge.inbox

  return (
    <div className="flex h-12 items-center align-middle">
      <input
        className={twMerge(
          'h-full rounded border border-white bg-black/40 px-3 py-1 text-sm font-light placeholder:text-white/60',
          destinationAddress &&
            !isAddress(destinationAddress) &&
            'border-red-400'
        )}
        name="destinationAddressInput"
        placeholder={`Recovery address`}
        onChange={e => {
          const newDestinationAddress = e.target.value
          setDestinationAddress(newDestinationAddress)
        }}
        onBlur={e => {
          setDestinationAddress(e.target.value)
        }}
        // stop password managers from autofilling
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
      <Button
        aria-label={`Recover funds`}
        variant="primary"
        className="ml-auto mr-3 w-14 rounded bg-green-400 p-2 text-xs text-black"
        onClick={async () => {
          if (!latestSigner || !destinationAddress) {
            return
          }

          const parentChainId = getArbitrumNetwork(chainId).parentChainId
          let currentChainId = latestSigner.provider.network.chainId
          while (currentChainId !== parentChainId) {
            currentChainId = (
              await switchChainAsync({ chainId: parentChainId })
            ).id
          }

          try {
            setIsLoading(true)
            const tx = await recoverFunds({
              address,
              balanceToRecover: balance,
              childProvider: childChainProvider,
              destinationAddress,
              parentProvider: parentChainProvider,
              inboxAddress: inboxAddress as string,
              signer: latestSigner
            })
            addTransaction({
              walletAddress: address,
              chainId,
              tx: tx.hash
            })
            trackEvent('Recover funds', {
              chainId,
              balanceToRecover: balance.toString()
            })

            // Rest of the flow is handled in useEffect, for both transactions triggered during that session, and transactions in previous sessions
          } catch (error) {
            setIsLoading(false)
            if (isUserRejectedError(error)) {
              return
            }

            handleError({
              error,
              label: 'recover_funds',
              category: 'contract_interaction'
            })
            errorToast(
              `Recover funds transaction failed: ${
                (error as Error)?.message ?? error
              }`
            )
          }
        }}
        disabled={
          !destinationAddress ||
          !isAddress(destinationAddress) ||
          isLoading ||
          transactions[address]?.[chainId] !== undefined
        }
      >
        {isLoading || transactions[address]?.[chainId] !== undefined ? (
          <Loader size={12} />
        ) : (
          'Recover'
        )}
      </Button>
    </div>
  )
}

export function RecoverFundsDialog(props: UseDialogProps) {
  const { address } = useAccount()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { data: lostFunds, isLoading } = useFundsOnAliasedAddress({
    address,
    isTestnet
  })

  if (isLoading || !lostFunds || lostFunds.length === 0) {
    return null
  }

  return (
    <Dialog
      {...props}
      title={<div className="text-xl">Recover funds</div>}
      isFooterHidden
      className="w-full"
    >
      <Table
        width={665}
        height={500}
        rowHeight={60}
        rowCount={lostFunds.length}
        headerHeight={52}
        headerRowRenderer={props => (
          <div className="mx:4 flex w-full border-b border-white/30 text-white">
            {props.columns}
          </div>
        )}
        rowGetter={({ index }) => lostFunds[index]}
        overscanRowCount={5}
        rowRenderer={({ columns, index, rowData }) => {
          return (
            <div
              className={twMerge(
                'flex items-center border-white/30 align-middle',
                index !== lostFunds.length && 'border-b'
              )}
              key={rowData[0]}
            >
              {columns[0]}
              {columns[1]}
              {columns[2]}
              <div className="ml-auto">{columns[3]}</div>
            </div>
          )
        }}
      >
        <Column
          label={
            <div className="h-full w-[180px] pb-2 pt-4 text-left text-sm font-normal md:w-full">
              TOKEN
            </div>
          }
          cellRenderer={props => <TokenColumn {...props} />}
          dataKey="balance"
          width={180}
        />
        <Column
          label={
            <div className="h-full w-[140px] pb-2 pt-4 text-left text-sm font-normal md:w-full">
              CHAIN
            </div>
          }
          cellRenderer={({ rowData }) => (
            <div className="flex h-12 items-center align-middle">
              <NetworkImage chainId={rowData[0]} className="h-5 w-5" />

              <span className="ml-1 text-sm">{getNetworkName(rowData[0])}</span>
            </div>
          )}
          dataKey="chainId"
          width={140}
        />
        <Column
          label={
            <div className="h-full w-[345px] pb-2 pt-4 text-left text-sm font-normal md:w-full">
              DESTINATION ADDRESS
            </div>
          }
          cellRenderer={props => (
            <ActionColumn {...props} key={props.rowData[0]} />
          )}
          dataKey="destinationAddress"
          width={345}
          flexShrink={0}
        />
      </Table>
    </Dialog>
  )
}
