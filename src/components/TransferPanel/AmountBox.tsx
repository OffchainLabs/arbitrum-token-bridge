import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'

import { useAppState } from '../../state'
import { getTokenImg } from '../../util'
import { NetworkSwitchButton } from '../common/NetworkSwitchButton'
import { TokenModal } from '../TokenModal/TokenModal'

const AmountBox = ({
  amount,
  setAmount
}: {
  amount: string
  setAmount: (amount: string) => void
}): JSX.Element => {
  const {
    app: { selectedToken, networkID }
  } = useAppState()
  const [tokeModalOpen, setTokenModalOpen] = useState(false)

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
    <div className="flex flex-col items-start sm:items-end text-left sm:text-right  bg-white rounded-md ">
      <TokenModal isOpen={tokeModalOpen} setIsOpen={setTokenModalOpen} />
      <input
        type="number"
        autoFocus
        className="text-xl leading-8 font-semibold mb-2 placeholder-gray3 text-gray1 focus:ring-0 focus:outline-none text-left sm:text-right max-w-48"
        placeholder="Enter amount here"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      {/* <p className="text-xl leading-8 font-normal text-gray1"> */}
      {/*  {selectedToken ? selectedToken.symbol : 'Eth'} */}
      {/* </p> */}
      <div className="flex items-center justify-end w-full">
        {/* <NetworkSwitchButton /> */}
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
    </div>
  )
}

export { AmountBox }
