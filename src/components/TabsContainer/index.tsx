import React, { useState } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Balance from 'components/Balance'
import { BridgeBalance } from 'arb-token-bridge'

type TabProps = {
  ethBalances: BridgeBalance
}
const TabsContainer: React.FC<TabProps> = ({ ethBalances }) => {
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
        <div>erc20</div>
      </Tab>
      <Tab eventKey="erc721" title="ERC-721">
        <div>erc721</div>
      </Tab>
    </Tabs>
  )
}

export default TabsContainer
