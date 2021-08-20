import React, { Dispatch, SetStateAction } from 'react'

import { formatEther } from 'ethers/lib/utils'
import { BridgeBalance } from 'token-bridge-sdk'

import ExplorerLink from '../common/ExplorerLink'

const L2NetworkBox = ({
  balance,
  address,
  className,
  amount,
  setAmount
}: {
  balance: BridgeBalance | undefined
  address: string
  className?: string
  amount: string
  setAmount: Dispatch<SetStateAction<string>>
}) => {
  const ethChainBalance = balance ? +formatEther(balance.arbChainBalance) : 0

  return (
    <div
      className={`w-networkBox mx-auto shadow-networkBox bg-white p-6 rounded-lg ${
        className || ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm leading-5 font-medium text-gray-700 mb-1">
            Layer 2
          </p>
          <p className="text-xl leading-8 font-semibold text-bright-blue mb-1">
            {ethChainBalance} eth
          </p>
          <p className="text-sm leading-5 font-medium text-gray-500">
            <ExplorerLink hash={address} type="address" />
          </p>
        </div>
        <div className="flex flex-col text-right">
          <input
            type="text"
            className="text-sm leading-5 font-medium mb-2 text-gray3 ring-0 outline-none text-right"
            placeholder="Enter Amount Here"
          />
          <p className="text-xl leading-8 font-normal text-gray1">eth</p>
        </div>
      </div>
    </div>
  )
}

export { L2NetworkBox }
