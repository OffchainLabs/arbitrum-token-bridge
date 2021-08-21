import React, { FormEventHandler, useMemo, useState } from 'react'

import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import Loader from 'react-loader-spinner'
import { TokenType } from 'token-bridge-sdk'

import { useActions, useAppState } from '../../state'
import { Modal } from '../common/Modal'

interface TokenRowProps {
  address: string | null
  balance: BigNumber | undefined
  onTokenSelected: () => void
}

const TokenRow = ({
  address,
  balance,
  onTokenSelected
}: TokenRowProps): JSX.Element => {
  const {
    app: {
      arbTokenBridge: { bridgeTokens }
    }
  } = useAppState()
  const actions = useActions()

  const token = useMemo(
    () => (address ? bridgeTokens[address] : null),
    [address]
  )

  const tokenName = useMemo(() => {
    if (address === null) {
      return 'Ethereum'
    }
    return token ? token.name : address
  }, [token, address])

  const tokenSymbol = useMemo(() => {
    if (address === null) {
      return 'Eth'
    }
    return token ? token.symbol : ''
  }, [token, address])

  function selectToken() {
    actions.app.setSelectedToken(token || null)
    onTokenSelected()
  }

  return (
    <button
      onClick={selectToken}
      type="button"
      className="flex items-center justify-between border border-gray-300 rounded-md px-6 py-3 bg-white hover:bg-gray-100"
    >
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 mr-4 bg-navy" />
        <p className="text-base leading-6 font-bold text-gray-900">
          {tokenName}
        </p>
      </div>

      <p className="text-base leading-6 font-medium text-gray-900">
        {+formatEther(balance || 0)} {tokenSymbol}
      </p>
    </button>
  )
}

export const TokenModalBody = ({
  onTokenSelected
}: {
  onTokenSelected: () => void
}): JSX.Element => {
  const {
    app: {
      arbTokenBridge: { balances, token, pendingWithdrawalsMap },
      isDepositMode
    }
  } = useAppState()
  const [newToken, setNewToken] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const tokensWithPositiveBalance = useMemo(() => {
    if (balances.erc20) {
      return Object.keys(balances.erc20).filter((addr: string) => {
        if (isDepositMode) {
          return !BigNumber.from(balances.erc20[addr]?.balance || 0).isZero()
        }
        return !BigNumber.from(
          balances.erc20[addr]?.arbChainBalance || 0
        ).isZero()
      })
    }
    return []
  }, [balances.erc20, isDepositMode])

  const addNewToken: FormEventHandler = async e => {
    e.preventDefault()

    if (isAddingToken) {
      return
    }
    setIsAddingToken(true)
    try {
      await token.add(newToken, TokenType.ERC20)
      await token.updateBalances()

      setNewToken('')
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsAddingToken(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 overflow-auto max-h-tokenList">
        <TokenRow
          address={null}
          balance={
            isDepositMode ? balances.eth.balance : balances.eth.arbChainBalance
          }
          onTokenSelected={onTokenSelected}
        />
        {tokensWithPositiveBalance.map(erc20Address => (
          <TokenRow
            key={erc20Address}
            address={erc20Address}
            balance={
              isDepositMode
                ? balances.erc20[erc20Address]?.balance
                : balances.erc20[erc20Address]?.arbChainBalance
            }
            onTokenSelected={onTokenSelected}
          />
        ))}
      </div>
      <form onSubmit={addNewToken} className="flex flex-col">
        <label
          htmlFor="newTokenAddress"
          className="text-sm leading-5 font-medium text-gray-700 mb-1"
        >
          Don’t see your token? Enter token address
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="newTokenAddress"
            value={newToken}
            onChange={e => setNewToken(e.target.value)}
            placeholder="Token address"
            className="text-dark-blue shadow-sm border border-gray-300 rounded-md p-2 w-full"
          />

          <button
            type="submit"
            disabled={newToken === ''}
            className="flex items-center justify-center bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 p-2 min-w-16"
          >
            {isAddingToken ? (
              <Loader
                type="Oval"
                color="rgb(45, 55, 75)"
                height={16}
                width={16}
              />
            ) : (
              'Add'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

const TokenModal = ({
  isOpen,
  setIsOpen
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}): JSX.Element => {
  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} title="Choose token">
      <TokenModalBody onTokenSelected={() => setIsOpen(false)} />
    </Modal>
  )
}

export { TokenModal }
