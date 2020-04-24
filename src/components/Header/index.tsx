import React, { useEffect, useState } from 'react'
import {
  BridgeBalance, ERC721Balance
} from 'arb-token-bridge'
import { formatEther } from 'ethers/utils'
interface Web3Data {
  ethAddress: string
  vmId: string
  ethBalance: BridgeBalance | undefined
  erc20Balance: BridgeBalance | undefined
  erc721Balance: ERC721Balance | undefined
}
const Header = ({ ethAddress, vmId, ethBalance, erc20Balance, erc721Balance }: Web3Data) => {
  return (
    <div className="col-lg-12">
      <h1 className="text-center">Arbitrum Token Bridge</h1>
      <p>
        Your address: <span id="accountAddress">{ethAddress}</span>
      </p>
      <p>
        ArbChain address: <span id="rollupAddress">{vmId}</span>
      </p>
      {ethBalance && <p>
        Total ETH On Arb Chain: <span>{formatEther(ethBalance.totalArbBalance)}</span>
      </p>
      }
       {erc20Balance && <p>
        Total {erc20Balance.asset} On Arb Chain: <span>{formatEther(erc20Balance.totalArbBalance)}</span>
      </p>
      }
      { erc721Balance && <p>
        Total # of {erc721Balance.asset} NFTs On Arb Chain: <span>{erc721Balance.totalArbTokens.length}</span>
      </p>
      }
      <hr />
    </div>
  )
}

export default Header
