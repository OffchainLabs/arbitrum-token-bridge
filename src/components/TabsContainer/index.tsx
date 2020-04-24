import React, { useState } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Balance from 'components/Balance'
import ERC721BalanceUi from 'components/Balance/ERC721Balance'

import { BridgeBalance, TokenType, ERC721Balance } from 'arb-token-bridge'
import AssetDropDown from 'components/AssetDropDown'
import EthActions from 'components/Actions/EthActions'
import ERC20Actions from 'components/Actions/ERC20Actions'
import ERC721Actions from 'components/Actions/ERC721Actions'

type TabProps = {
  ethBalances: BridgeBalance
  erc20BridgeBalance: BridgeBalance | undefined
  erc721balance: ERC721Balance | undefined
  erc20sCached: string[]
  erc721sCached: string[]
  eth: any
  token: any
  currentERC20Address: string
  currentERC721Address: string
  bridgeTokens: any
  addToken: (a: string, type: TokenType) => Promise<string>
}

type TabName = 'eth' | 'erc20' | 'erc721'

const TabsContainer = ({
  ethBalances,
  erc20BridgeBalance,
  erc20sCached,
  addToken,
  eth,
  token,
  erc721balance,
  erc721sCached,
  currentERC20Address,
  bridgeTokens,
  currentERC721Address
}: TabProps) => {
  const [key, setKey] = useState('eth')

  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k: string) => setKey(k)}
    >
      <Tab eventKey="eth" title="ETH">
        <Balance assetName={'ETH'} balances={ethBalances} />
        <EthActions balances={ethBalances} eth={eth} />
      </Tab>
      <Tab eventKey="erc20" title="ERC-20">
        <Balance assetName={'ERC20'} balances={erc20BridgeBalance} />
        <AssetDropDown
          erc20sCached={erc20sCached}
          addToken={addToken}
          tokenType={TokenType.ERC20}
        />
        <ERC20Actions
          balances={erc20BridgeBalance}
          eth={token}
          bridgeTokens={bridgeTokens}
          currentERC20Address={currentERC20Address}
        />
      </Tab>
      <Tab eventKey="erc721" title="ERC-721">
        <ERC721BalanceUi balances={erc721balance} />
        <AssetDropDown
          erc20sCached={erc721sCached}
          addToken={addToken}
          tokenType={TokenType.ERC721}
        />

        <ERC721Actions
          balances={erc721balance}
          eth={token}
          bridgeTokens={bridgeTokens}
          currentERC721Address={currentERC721Address}
        />
      </Tab>
    </Tabs>
  )
}

export default TabsContainer
