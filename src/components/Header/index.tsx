import React, { useEffect, useState } from 'react'
import {
  BridgeBalance,
  ERC721Balance,
  ContractStorage,
  BridgeToken
} from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import { useIsDepositMode } from 'components/App/ModeContext'
interface Web3Data {
  ethAddress: string
  vmId: string
  ethBalance: BridgeBalance | undefined
  erc20Balance: BridgeBalance | undefined
  erc721Balance: ERC721Balance | undefined
  bridgeTokens: ContractStorage<BridgeToken>
  currentERC20Address: string
  currentERC721Address: string
}

const Header = ({
  ethAddress,
  vmId,
  ethBalance,
  erc20Balance,
  erc721Balance,
  bridgeTokens,
  currentERC20Address,
  currentERC721Address
}: Web3Data) => {
  const currentERC20 = bridgeTokens[currentERC20Address]
  const erc20Symbol = currentERC20 ? currentERC20.symbol : ''

  const currentERC721 = bridgeTokens[currentERC721Address]
  const erc721Symbol = currentERC721 ? currentERC721.symbol : ''
  const isDepositMode = useIsDepositMode()
  return (
    <div className="col-lg-12">
      <h1 className="text-center">Arbitrum Token Bridge</h1>
      <h5 className="text-center">
        Connected To {isDepositMode ? 'L1' : 'L2'}
      </h5>

      <p>
        Your address: <span id="accountAddress">{ethAddress}</span>
      </p>
      <p>
        ArbChain address: <span id="rollupAddress">{vmId}</span>
      </p>
      {ethBalance && (
        <p>
          Total ETH On Arb Chain:{' '}
          <span>{formatEther(ethBalance.totalArbBalance)}</span>
        </p>
      )}
      {erc20Balance && (
        <p>
          Total {erc20Symbol} On Arb Chain:{' '}
          <span>{formatEther(erc20Balance.totalArbBalance)}</span>
        </p>
      )}
      {erc721Balance && (
        <p>
          Total # of {erc721Symbol} NFTs On Arb Chain:{' '}
          <span>{erc721Balance.totalArbTokens.length}</span>
        </p>
      )}
      <hr />
    </div>
  )
}

export default Header
