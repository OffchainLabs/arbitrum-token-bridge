import React, { Dispatch, SetStateAction, useMemo } from 'react'

import { formatEther } from 'ethers/lib/utils'
import { BridgeBalance } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import ExplorerLink from '../common/ExplorerLink'

const NetworkBox = ({
  isL1,
  amount,
  className,
  setAmount
}: {
  isL1: boolean
  amount: string
  className?: string
  setAmount: Dispatch<SetStateAction<string>>
}) => {
  const {
    app: { isDepositMode, selectedToken, arbTokenBridge }
  } = useAppState()

  const balance = useMemo(() => {
    let b: BridgeBalance | undefined = arbTokenBridge?.balances?.eth
    if (selectedToken) {
      b = arbTokenBridge?.balances?.erc20[selectedToken.address]
    }
    if (isL1) {
      return b?.balance || 0
    }
    return b?.arbChainBalance || 0
  }, [isL1, selectedToken, arbTokenBridge])

  const canIEnterAmount = useMemo(() => {
    return (isL1 && isDepositMode) || (!isL1 && !isDepositMode)
  }, [isDepositMode, isL1])

  return (
    <div
      className={`w-networkBox mx-auto shadow-networkBox bg-white p-6 rounded-lg ${
        className || ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm leading-5 font-medium text-gray-700 mb-1">
            Layer {isL1 ? '1' : '2'}
          </p>
          <p className="text-xl leading-8 font-semibold text-bright-blue mb-1">
            {+formatEther(balance)}{' '}
            {selectedToken ? selectedToken.symbol : 'Eth'}
          </p>
          {selectedToken && (
            <p className="text-sm leading-5 font-medium text-gray-500">
              <ExplorerLink
                hash={isL1 ? selectedToken.address : selectedToken.l2Address}
                type="address"
                layer={isL1 ? 1 : 2}
              />
            </p>
          )}
        </div>
        {canIEnterAmount && (
          <div className="flex flex-col text-right">
            <input
              type="number"
              className="text-xl leading-8 font-semibold mb-2 placeholder-gray3 text-gray1 focus:ring-0 focus:outline-none text-right"
              placeholder="Enter Amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <p className="text-xl leading-8 font-normal text-gray1">
              {selectedToken ? selectedToken.symbol : 'Eth'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export { NetworkBox }
