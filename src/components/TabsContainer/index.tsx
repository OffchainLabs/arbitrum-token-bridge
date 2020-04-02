import React, { useState, useEffect } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Balance from 'components/Balance'
import { Balances, Template } from 'types'

type TabProps = {
  ethBalances: Balances
}
const TabsContainer = (data: Template) => {
  const [key, setKey] = useState('eth')

  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k: string) => setKey(k)}
    >
      <Tab eventKey="eth" title="ETH">
        <Balance assetName={'ETH'} balances={data.ethBalances} />
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
