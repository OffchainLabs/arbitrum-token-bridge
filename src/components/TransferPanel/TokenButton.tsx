import React, { useMemo, useState } from 'react'

import { useAppState } from '../../state'
import { getTokenImg } from '../../util'
import { TokenModal } from '../TokenModal/TokenModal'

const TokenButton = (): JSX.Element => {
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
    <div>
      <TokenModal isOpen={tokeModalOpen} setIsOpen={setTokenModalOpen} />
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
  )
}

export { TokenButton }
