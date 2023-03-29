import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLatest } from 'react-use'
import { ERC20BridgeToken, getL1TokenData } from 'token-bridge-sdk'
import {
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/outline'
import Tippy from '@tippyjs/react'
import { Loader } from '../common/atoms/Loader'
import { useActions, useAppState } from '../../state'
import {
  useTokensFromLists,
  useTokensFromUser,
  toERC20BridgeToken
} from './TokenSearchUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useERC20L1Address } from '../../hooks/useERC20L1Address'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { SafeImage } from '../common/SafeImage'
import { getExplorerUrl } from '../../util/networks'
import Image from 'next/image'
import GrumpyCat from '@/images/grumpy-cat.webp'

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
  const { data: l1Address, isLoading: isL1AddressLoading } = useERC20L1Address({
    eitherL1OrL2Address: address,
    l2Provider: l2.provider
  })

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

  const getL1TokenDataFromL1Address = useCallback(async () => {
    if (!l1Address) {
      return
    }

    return getL1TokenData({
      account: walletAddress,
      erc20L1Address: l1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider
    })
  }, [l1, l2, walletAddress, l1Address])

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
        setTokenToImport(toERC20BridgeToken(data))
      })
      .catch(() => {
        setStatus(ImportStatus.ERROR)
      })
  }, [
    address,
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

    const foundToken = tokensFromUser[l1Address || address]

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
    address,
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
        alert('This token is currently paused in the bridge')
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
  }

  if (status === ImportStatus.LOADING) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} title={modalTitle} isCustom>
        <div className="flex h-48 items-center justify-center md:min-w-[692px]">
          <Loader color="black" size="medium" />
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
              <Image src={GrumpyCat} alt="Grumpy cat" />
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
            This token hasn&apos;t been imported yet but appears on a token
            list. Are you sure you want to import it?
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
                This token isn&apos;t found on an active token list.
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
          <span className="text-xl font-bold leading-6">
            {tokenToImport?.symbol}
          </span>
          <span className="mb-3 mt-0">{tokenToImport?.name}</span>
          <a
            href={`${getExplorerUrl(l1.network.chainID)}/token/${
              tokenToImport?.address
            }`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1366C1' }}
            className="break-all underline"
          >
            {tokenToImport?.address}
          </a>

          {status === ImportStatus.UNKNOWN && (
            <div className="flex w-full justify-center pt-4">
              <Tippy
                theme="light"
                content={
                  <div>
                    This token address doesn&apos;t exist in any of the token
                    lists we have. This doesn&apos;t mean it&apos;s not good, it
                    just means{' '}
                    <span className="font-bold">proceed with caution.</span>
                    <br />
                    <br />
                    It&apos;s easy to impersonate the name of any token,
                    including ETH. Make sure you trust the source it came from.
                    If it&apos;s a popular token, there&apos;s a good chance we
                    have it on our list. If it&apos;s a smaller or newer token,
                    it&apos;s reasonable to believe we might not have it.
                  </div>
                }
              >
                <span className="cursor-pointer underline">
                  I&apos;m confused
                </span>
              </Tippy>
            </div>
          )}

          <div className="mt-6 flex w-full justify-start gap-1 rounded-lg bg-cyan p-3 text-sm text-dark">
            <InformationCircleIcon className="mt-[2px] h-4 w-4 shrink-0 stroke-dark" />
            <p>
              The bridge does not support tokens with non-standard behaviour in
              balance calculation, i.e. the token balance increases or decreases
              while sitting in a wallet address. If you are unsure, please
              contact the team behind the token.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
