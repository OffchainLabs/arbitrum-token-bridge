import React from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import Alert from 'react-bootstrap/Alert'
import networks from './networks'

const ethNetworkId = process.env.REACT_APP_ETH_NETWORK_ID as string
const arbNetworkId = process.env.REACT_APP_ARB_NETWORK_ID as string
const gifStyle = { maxWidth: 200, border: '1px solid black' }
export default () => {
  const network = networks[+ethNetworkId]
  const arbnetwork = networks[+arbNetworkId]

  const l1NetworkName = networks[+ethNetworkId].name
  const l2NetworkName = networks[+arbNetworkId].name

  return (
    <Container>
      <Alert variant={'danger'}>
        {' '}
        {`Unsupported network; connect to ${l1NetworkName} for L1 actions or ${l2NetworkName} for L2 actions`}
      </Alert>
      <Row>
        <Col style={{ border: '0px solid black' }} className="text-center">
          {' '}
          <h5> {l1NetworkName} (deposit into Arbitrum)</h5>
          <div style={{ minHeight: '50px' }}> </div>
          <img style={gifStyle} src={network.gif} />
        </Col>
        <Col style={{ border: '0px solid black' }} className="text-center">
          <h5> {l2NetworkName} (Withdraw from Arbitrum)</h5>
          <div style={{ minHeight: '50px', fontSize: '12px' }}>
            {' '}
            Connect to
            <a href="https://developer.offchainlabs.com/docs/Developer_Quickstart/">
              {' '}
              your own aggregator
            </a>{' '}
            or to our publically hosted node at{' '}
            <b>https://node.offchainlabs.com:8547</b> via Custom RPC
          </div>
          <img style={gifStyle} src={arbnetwork.gif} />
        </Col>
      </Row>
    </Container>
  )
}
