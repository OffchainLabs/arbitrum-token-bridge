import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'

import { formatEther } from 'ethers/lib/utils'
import { BridgeBalance, tokenLists } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { getTokenImg } from '../../util'
import ExplorerLink from '../common/ExplorerLink'
import { TokenModal } from '../TokenModal/TokenModal'

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
    app: { isDepositMode, selectedToken, arbTokenBridge, networkID }
  } = useAppState()
  const [tokeModalOpen, setTokenModalOpen] = useState(false)

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

  const tokenLogo = useMemo<string | undefined>(() => {
    if (!selectedToken?.address) {
      return 'https://ethereum.org/static/4b5288012dc4b32ae7ff21fccac98de1/31987/eth-diamond-black-gray.png'
    }
    if (networkID === null) {
      return undefined
    }
    return getTokenImg(networkID, selectedToken?.address)
  }, [selectedToken?.address, networkID])

  return (
    <div
      className={`max-w-networkBox w-full mx-auto shadow-networkBox bg-white p-6 rounded-lg ${
        className || ''
      }`}
    >
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row">
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
          <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
            <TokenModal isOpen={tokeModalOpen} setIsOpen={setTokenModalOpen} />
            <input
              type="number"
              className="text-xl leading-8 font-semibold mb-2 placeholder-gray3 text-gray1 focus:ring-0 focus:outline-none text-left sm:text-right"
              placeholder="Enter Amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            {/* <p className="text-xl leading-8 font-normal text-gray1"> */}
            {/*  {selectedToken ? selectedToken.symbol : 'Eth'} */}
            {/* </p> */}
            <button
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className="bg-white border border-gray-300 shadow-md active:shadow-sm rounded-md py-2 px-4"
            >
              <div className="flex items-center whitespace-nowrap flex-nowrap ">
                <div>Token:</div>
                {tokenLogo && (
                  <img
                    src={tokenLogo}
                    alt="Token logo"
                    className="rounded-full w-5 h-5 mx-1"
                  />
                )}
                <div>{selectedToken ? selectedToken.symbol : 'Eth'}</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export { NetworkBox }
