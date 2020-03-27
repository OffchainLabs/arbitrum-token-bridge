import React, { useState, useEffect } from 'react'

import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'

export default () => {
  const [key, setKey] = useState('eth')
  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k: string) => setKey(k)}
    >
      <Tab eventKey="eth" title="ETH">
        <div>1</div>
      </Tab>
      <Tab eventKey="erc20" title="ERC-20">
        <div>2</div>
      </Tab>
      <Tab eventKey="erc721" title="ERC-721">
        <div>3</div>
      </Tab>
    </Tabs>
  )
}
