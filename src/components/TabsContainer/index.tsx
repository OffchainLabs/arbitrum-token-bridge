import React, { useState } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Balance from 'components/Balance'
import { BridgeBalance, TokenType } from 'arb-token-bridge'
import AssetDropDown from 'components/AssetDropDown'

type TabProps = {
  ethBalances: BridgeBalance
  erc20BridgeBalance: BridgeBalance | undefined
  erc20sCached: string[] | null
  addToken: (a: string, type: TokenType) => Promise<string>
}

type TabName = 'eth' | 'erc20' | 'erc721'

const TabsContainer = ({
  ethBalances,
  erc20BridgeBalance,
  erc20sCached,
  addToken
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
      </Tab>
      <Tab eventKey="erc20" title="ERC-20">
        <Balance assetName={'ERC20'} balances={erc20BridgeBalance} />
        <AssetDropDown erc20sCached={erc20sCached ?? []} addToken={addToken} />
      </Tab>
      <Tab eventKey="erc721" title="ERC-721">
        <div>erc721</div>
      </Tab>
    </Tabs>
  )
}

export default TabsContainer
