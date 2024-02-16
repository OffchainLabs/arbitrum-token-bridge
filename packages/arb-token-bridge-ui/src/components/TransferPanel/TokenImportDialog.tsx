import { useAccount } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLatest } from 'react-use'
import { create } from 'zustand'

import { useERC20L1Address } from '../../hooks/useERC20L1Address'
import { useActions, useAppState } from '../../state'
import {
  erc20DataToErc20BridgeToken,
  fetchErc20Data,
  isValidErc20
} from '../../util/TokenUtils'
import { Loader } from '../common/atoms/Loader'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { warningToast } from '../common/atoms/Toast'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { isWithdrawOnlyToken } from '../../util/WithdrawOnlyUtils'
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils'
import { useTransferDisabledDialogStore } from './TransferDisabledDialog'
import { TokenInfo } from './TokenInfo'
import { NoteBox } from '../common/NoteBox'

enum ImportStatus {
  LOADING,
  KNOWN,
  KNOWN_UNIMPORTED,
  UNKNOWN,
  ERROR
}

type TokenListSearchResult =
  | {
      found: false
    }
  | {
      found: true
      token: ERC20BridgeToken
      status: ImportStatus
    }

type TokenImportDialogStore = {
  isOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

export const useTokenImportDialogStore = create<TokenImportDialogStore>(
  set => ({
    isOpen: false,
    openDialog: () => set({ isOpen: true }),
    closeDialog: () => set({ isOpen: false })
  })
)

type TokenImportDialogProps = Omit<UseDialogProps, 'isOpen'> & {
  tokenAddress: string
}

export function TokenImportDialog({
  onClose,
  tokenAddress
}: TokenImportDialogProps): JSX.Element {
  const { address: walletAddress } = useAccount()
  const {
    app: {
      arbTokenBridge: { bridgeTokens, token },
      selectedToken
    }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const actions = useActions()

  const tokensFromUser = useTokensFromUser()
  const latestTokensFromUser = useLatest(tokensFromUser)

  const tokensFromLists = useTokensFromLists()
  const latestTokensFromLists = useLatest(tokensFromLists)

  const latestBridgeTokens = useLatest(bridgeTokens)

  const [status, setStatus] = useState<ImportStatus>(ImportStatus.LOADING)
  const [isImportingToken, setIsImportingToken] = useState<boolean>(false)
  const [tokenToImport, setTokenToImport] = useState<ERC20BridgeToken>()
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()
  const { isOpen } = useTokenImportDialogStore()
  const [isDialogVisible, setIsDialogVisible] = useState(false)
  const { data: l1Address, isLoading: isL1AddressLoading } = useERC20L1Address({
    eitherL1OrL2Address: tokenAddress,
    l2Provider: childChainProvider
  })

  // we use a different state to handle dialog visibility to trigger the entry transition,
  // otherwise if we only used isOpen then the transition would never trigger because
  // we conditionally render the component and we'd always start with isOpen as true
  //
  // for the transition to work we need to start as false and update it to true
  useEffect(() => {
    setIsDialogVisible(isOpen)
  }, [isOpen])

  const modalTitle = useMemo(() => {
    switch (status) {
      case ImportStatus.LOADING:
        return 'Loading token'
      case ImportStatus.KNOWN:
      case ImportStatus.KNOWN_UNIMPORTED:
        return 'Import known token'
      case ImportStatus.UNKNOWN:
        return 'Import unknown token'
      case ImportStatus.ERROR:
        return 'Invalid token address'
    }
  }, [status])

  const getL1TokenDataFromL1Address = useCallback(async () => {
    if (!l1Address || !walletAddress) {
      return
    }

    const erc20Params = { address: l1Address, provider: parentChainProvider }

    if (!(await isValidErc20(erc20Params))) {
      throw new Error(`${l1Address} is not a valid ERC-20 token`)
    }

    return fetchErc20Data(erc20Params)
  }, [parentChainProvider, walletAddress, l1Address])

  const searchForTokenInLists = useCallback(
    (erc20L1Address: string): TokenListSearchResult => {
      // We found the token in an imported list
      const currentBridgeTokens = latestBridgeTokens.current
      if (typeof currentBridgeTokens === 'undefined') {
        return { found: false }
      }

      const l1Token = currentBridgeTokens[erc20L1Address]
      if (typeof l1Token !== 'undefined') {
        return {
          found: true,
          token: l1Token,
          status: ImportStatus.KNOWN
        }
      }

      const tokens = {
        ...latestTokensFromLists.current,
        ...latestTokensFromUser.current
      }

      const token = tokens[erc20L1Address]
      // We found the token in an unimported list
      if (typeof token !== 'undefined') {
        return {
          found: true,
          token,
          status: ImportStatus.KNOWN_UNIMPORTED
        }
      }

      return { found: false }
    },
    [latestBridgeTokens, latestTokensFromLists, latestTokensFromUser]
  )

  const selectToken = useCallback(
    async (_token: ERC20BridgeToken) => {
      await token.updateTokenData(_token.address)
      actions.app.setSelectedToken(_token)
    },
    [token, actions]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (typeof bridgeTokens === 'undefined') {
      return
    }

    if (!isL1AddressLoading && !l1Address) {
      setStatus(ImportStatus.ERROR)
      return
    }

    if (l1Address) {
      const searchResult1 = searchForTokenInLists(l1Address)

      if (searchResult1.found) {
        setStatus(searchResult1.status)
        setTokenToImport(searchResult1.token)

        return
      }
    }

    // Can't find the address provided, so we look further
    getL1TokenDataFromL1Address()
      .then(data => {
        if (!data) {
          return
        }

        // We couldn't find the address within our lists
        setStatus(ImportStatus.UNKNOWN)
        setTokenToImport(erc20DataToErc20BridgeToken(data))
      })
      .catch(() => {
        setStatus(ImportStatus.ERROR)
      })
  }, [
    tokenAddress,
    bridgeTokens,
    getL1TokenDataFromL1Address,
    isL1AddressLoading,
    isOpen,
    l1Address,
    searchForTokenInLists
  ])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (isL1AddressLoading && !l1Address) {
      return
    }

    const foundToken = tokensFromUser[l1Address || tokenAddress]

    if (typeof foundToken === 'undefined') {
      return
    }

    // Listen for the token to be added to the bridge so we can automatically select it
    if (foundToken.address !== selectedToken?.address) {
      onClose(true)
      selectToken(foundToken)
    }
  }, [
    isL1AddressLoading,
    tokenAddress,
    isOpen,
    l1Address,
    onClose,
    selectToken,
    selectedToken,
    tokensFromUser
  ])

  async function storeNewToken(newToken: string) {
    return token.add(newToken).catch((ex: Error) => {
      setStatus(ImportStatus.ERROR)

      if (ex.name === 'TokenDisabledError') {
        warningToast('This token is currently paused in the bridge')
      }
    })
  }

  function handleTokenImport() {
    if (typeof bridgeTokens === 'undefined') {
      return
    }

    if (isImportingToken) {
      return
    }

    setIsImportingToken(true)

    if (!l1Address) {
      return
    }

    if (typeof bridgeTokens[l1Address] !== 'undefined') {
      // Token is already added to the bridge
      onClose(true)
      selectToken(tokenToImport!)
    } else {
      // Token is not added to the bridge, so we add it
      storeNewToken(l1Address).catch(() => {
        setStatus(ImportStatus.ERROR)
      })
    }

    // do not allow import of withdraw-only tokens at deposit mode
    if (isDepositMode && isWithdrawOnlyToken(l1Address, childChain.id)) {
      openTransferDisabledDialog()
      return
    }

    if (isTransferDisabledToken(l1Address, childChain.id)) {
      openTransferDisabledDialog()
      return
    }
  }

  if (status === ImportStatus.LOADING) {
    return (
      <Dialog
        isOpen={isDialogVisible}
        onClose={onClose}
        title={modalTitle}
        actionButtonProps={{ hidden: true }}
      >
        <div className="flex h-48 items-center justify-center">
          <Loader color="white" size="medium" />
        </div>
      </Dialog>
    )
  }

  if (status === ImportStatus.ERROR) {
    return (
      <Dialog
        isOpen={isDialogVisible}
        onClose={onClose}
        title={modalTitle}
        actionButtonProps={{ hidden: true }}
      >
        <span className="flex py-4">
          Whoops, looks like this token address is invalid. Try asking the token
          team to update their link.
        </span>
      </Dialog>
    )
  }

  return (
    <Dialog
      isOpen={isDialogVisible}
      onClose={onClose}
      title={modalTitle}
      actionButtonProps={{
        loading: isImportingToken,
        onClick: handleTokenImport
      }}
      actionButtonTitle="Import token"
    >
      <div className="flex flex-col space-y-4 pt-4">
        {status === ImportStatus.KNOWN && (
          <span>This token is on an imported token list:</span>
        )}

        {status === ImportStatus.KNOWN_UNIMPORTED && (
          <span>
            This token hasn&apos;t been imported yet but appears on a token
            list:
          </span>
        )}

        <div className="flex flex-col pb-4">
          <TokenInfo token={tokenToImport} showFullAddress />

          {status === ImportStatus.UNKNOWN && (
            <NoteBox className="mt-4" variant="warning">
              <div className="flex flex-col space-y-2">
                <p>
                  This token address doesn&apos;t exist in any of the token
                  lists we have. This doesn&apos;t mean it&apos;s not good, it
                  just means{' '}
                  <span className="font-bold">proceed with caution.</span>
                </p>
                <p>
                  It&apos;s easy to impersonate the name of any token, including
                  ETH. Make sure you trust the source it came from. If it&apos;s
                  a popular token, there&apos;s a good chance we have it on our
                  list. If it&apos;s a smaller or newer token, it&apos;s
                  reasonable to believe we might not have it.
                </p>
              </div>
            </NoteBox>
          )}

          <NoteBox className="mt-4">
            <span className="font-medium">
              Non-standard tokens aren&apos;t supported by the bridge.
            </span>{' '}
            Ex: if the token balance increases or decreases while sitting in a
            wallet address. Contact the team behind the token to find out if
            this token is standard or not.
          </NoteBox>
        </div>
      </div>
    </Dialog>
  )
}
