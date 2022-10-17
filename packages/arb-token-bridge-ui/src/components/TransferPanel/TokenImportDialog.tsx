import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLatest } from 'react-use'
import { ERC20BridgeToken, getL1TokenData } from 'token-bridge-sdk'
import { ExclamationCircleIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'
import Tippy from '@tippyjs/react'

import { useActions, useAppState } from '../../state'
import {
  useTokensFromLists,
  useTokensFromUser,
  toERC20BridgeToken
} from './TokenSearchUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { SafeImage } from '../common/SafeImage'
import { ChainId } from '../../util/networks'

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

export type TokenImportDialogProps = UseDialogProps & { address: string }

export function TokenImportDialog({
  isOpen,
  onClose,
  address
}: TokenImportDialogProps): JSX.Element {
  const {
    app: {
      arbTokenBridge: { bridgeTokens, token, walletAddress },
      selectedToken
    }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const actions = useActions()

  const tokensFromUser = useTokensFromUser()
  const latestTokensFromUser = useLatest(tokensFromUser)

  const tokensFromLists = useTokensFromLists()
  const latestTokensFromLists = useLatest(tokensFromLists)

  const latestBridgeTokens = useLatest(bridgeTokens)

  const [status, setStatus] = useState<ImportStatus>(ImportStatus.LOADING)
  const [isImportingToken, setIsImportingToken] = useState<boolean>(false)
  const [tokenToImport, setTokenToImport] = useState<ERC20BridgeToken>()

  const modalTitle = useMemo(() => {
    switch (status) {
      case ImportStatus.LOADING:
        return 'Loading token'
      case ImportStatus.KNOWN:
      case ImportStatus.KNOWN_UNIMPORTED:
        return 'Import known token'
      case ImportStatus.UNKNOWN:
        return (
          <span>
            Import <span style={{ color: '#CD0000' }}>unknown</span> token{' '}
          </span>
        )
      case ImportStatus.ERROR:
        return 'Invalid token address'
    }
  }, [status])

  const isLoadingBridgeTokens = useMemo(() => {
    if (typeof bridgeTokens === 'undefined') {
      return true
    }

    if (Object.keys(bridgeTokens).length === 0) {
      // We currently don't have a token list for Arbitrum Goerli
      if (l2.network.chainID === ChainId.ArbitrumGoerli) {
        return false
      }

      return true
    }

    return false
  }, [bridgeTokens, l2.network])

  const getL1TokenDataFromL1OrL2Address = useCallback(
    async (eitherL1OrL2Address: string) => {
      if (typeof token === 'undefined') {
        return
      }

      const addressOnL1 = await token.getL1ERC20Address(eitherL1OrL2Address)

      if (addressOnL1) {
        return getL1TokenData({
          account: walletAddress,
          erc20L1Address: addressOnL1,
          l1Provider: l1.provider,
          l2Provider: l2.provider
        })
      } else {
        return getL1TokenData({
          account: walletAddress,
          erc20L1Address: eitherL1OrL2Address,
          l1Provider: l1.provider,
          l2Provider: l2.provider
        })
      }
    },
    [l1, l2, walletAddress, token]
  )

  const searchForTokenInLists = useCallback(
    (erc20L1Address: string): TokenListSearchResult => {
      // We found the token in an imported list
      if (typeof latestBridgeTokens.current[erc20L1Address] !== 'undefined') {
        return {
          found: true,
          token: latestBridgeTokens.current[erc20L1Address]!,
          status: ImportStatus.KNOWN
        }
      }

      const tokens = {
        ...latestTokensFromLists.current,
        ...latestTokensFromUser.current
      }

      // We found the token in an unimported list
      if (typeof tokens[erc20L1Address] !== 'undefined') {
        return {
          found: true,
          token: tokens[erc20L1Address],
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

    if (isLoadingBridgeTokens) {
      return
    }

    const searchResult1 = searchForTokenInLists(address)

    if (searchResult1.found) {
      setStatus(searchResult1.status)
      setTokenToImport(searchResult1.token)

      return
    }

    // Can't find the address provided, so we look further
    getL1TokenDataFromL1OrL2Address(address)
      .then(data => {
        if (data) {
          const addressOnL1 = data.contract.address.toLowerCase()
          const searchResult2 = searchForTokenInLists(addressOnL1)

          if (searchResult2.found) {
            // The address provided was an L2 address, and we found the corresponding L1 address within our lists
            setStatus(searchResult2.status)
            setTokenToImport(searchResult2.token)
          } else {
            // We couldn't find the address within our lists
            setStatus(ImportStatus.UNKNOWN)
            setTokenToImport(toERC20BridgeToken(data))
          }
        }
      })
      .catch(() => {
        setStatus(ImportStatus.ERROR)
      })
  }, [
    isOpen,
    isLoadingBridgeTokens,
    address,
    bridgeTokens,
    searchForTokenInLists,
    getL1TokenDataFromL1OrL2Address
  ])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const foundToken = tokensFromUser[address]

    if (typeof foundToken === 'undefined') {
      return
    }

    // Listen for the token to be added to the bridge so we can automatically select it
    if (foundToken.address !== selectedToken?.address) {
      onClose(true)
      selectToken(foundToken)
    }
  }, [isOpen, tokensFromUser, address, selectedToken, selectToken, onClose])

  async function storeNewToken(newToken: string) {
    return token.add(newToken).catch((ex: Error) => {
      setStatus(ImportStatus.ERROR)

      if (ex.name === 'TokenDisabledError') {
        alert('This token is currently paused in the bridge')
      }
    })
  }

  function handleTokenImport() {
    if (isImportingToken) {
      return
    }

    setIsImportingToken(true)

    if (typeof bridgeTokens[address] !== 'undefined') {
      // Token is already added to the bridge
      onClose(true)
      selectToken(tokenToImport!)
    } else {
      // Token is not added to the bridge, so we add it
      storeNewToken(address).catch(() => {
        setStatus(ImportStatus.ERROR)
      })
    }
  }

  if (status === ImportStatus.LOADING) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} title={modalTitle} isCustom>
        <div className="flex h-48 items-center justify-center md:min-w-[692px]">
          <Loader type="Oval" color="#000" height={32} width={32} />
        </div>
      </Dialog>
    )
  }

  if (status === ImportStatus.ERROR) {
    return (
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        actionButtonProps={{ className: 'hidden' }}
      >
        <div className="flex flex-col space-y-2 md:min-w-[628px]">
          <div>
            <div className="flex flex-col">
              <span>
                Whoops, looks like this token address is invalid.
                <br />
                Try asking the token team to update their link.
              </span>
            </div>
            <div className="flex w-full justify-center py-4">
              <img src="/images/grumpy-cat.jpg" alt="Grumpy cat" />
            </div>
          </div>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      actionButtonProps={{
        loading: isImportingToken,
        onClick: handleTokenImport
      }}
      actionButtonTitle="Import token"
    >
      <div className="flex flex-col space-y-2 md:min-w-[628px] md:max-w-[628px]">
        {status === ImportStatus.KNOWN && (
          <span>This token is on an imported token list as:</span>
        )}

        {status === ImportStatus.KNOWN_UNIMPORTED && (
          <span>
            This token hasn't been imported yet but appears on a token list. Are
            you sure you want to import it?
          </span>
        )}

        {status === ImportStatus.UNKNOWN && (
          <div className="flex flex-col items-center space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <ExclamationCircleIcon
              style={{ color: '#CD0000' }}
              className="h-6 w-6"
            />
            <div className="flex flex-col">
              <span>
                This token isn't found on an active token list.
                <br />
                Make sure you trust the source that led you here.
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center py-4">
          {tokenToImport?.logoURI && (
            <SafeImage
              style={{ width: '25px', height: '25px' }}
              className="mb-2 rounded-full"
              src={tokenToImport?.logoURI}
              alt={`${tokenToImport?.name} logo`}
            />
          )}
          <span className="text-xl font-bold">{tokenToImport?.symbol}</span>
          <span className="mt-0 mb-4">{tokenToImport?.name}</span>
          <a
            href={`${l1.network?.explorerUrl}/token/${tokenToImport?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1366C1' }}
            className="break-all underline"
          >
            {tokenToImport?.address}
          </a>

          {status === ImportStatus.UNKNOWN && (
            <div className="flex w-full justify-start pt-4">
              <Tippy
                theme="light"
                content={
                  <div>
                    This token address doesn't exist in any of the token lists
                    we have. This doesn't mean it's not good, it just means{' '}
                    <span className="font-bold">proceed with caution.</span>
                    <br />
                    <br />
                    It's easy to impersonate the name of any token, including
                    ETH. Make sure you trust the source it came from. If it's a
                    popular token, there's a good chance we have it on our list.
                    If it's a smaller or newer token, it's reasonable to believe
                    we might not have it.
                  </div>
                }
              >
                <span className="cursor-pointer underline">I'm confused</span>
              </Tippy>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
