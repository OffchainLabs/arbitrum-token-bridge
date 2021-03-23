import React from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import Alert from 'react-bootstrap/Alert'
import networks, { arbNetworkIds } from './networks'
import explorer from 'media/gifs/explorer.gif'

const ethNetworkId = process.env.REACT_APP_ETH_NETWORK_ID as string
const arbNetworkId = process.env.REACT_APP_ARB_NETWORK_ID as string

const CopyLink = ({ url, msg }: { url: string; msg: string }) => {

  const onClick = (e: any) => {
    e.preventDefault()
    copyTextToClipboard(url)
    alert(msg)
  }
  return (
    <a href="" onClick={onClick}>
      {url}
    </a>
  )
}

export default () => {
  const network = networks[+ethNetworkId]
  const arbnetwork = networks[+arbNetworkId]

  const l1NetworkName = networks[+ethNetworkId].name
  const l2NetworkName = networks[+arbNetworkId].name


  const arbV2Testnet = networks[+arbNetworkIds[1]]
  const arbV3Testnet = networks[+arbNetworkIds[2]]
  const arbV4Testnet = networks[+arbNetworkIds[3]]

  return (
    <Container>
      <Alert variant={'primary'}>
        {' '}
        {`Connect to ${l1NetworkName} for L1 actions or ${l2NetworkName} for L2 actions`}
      </Alert>
      <Row className="text-center">
        <Col>
          {' '}
          <div style={styles.upperSecton}>
            <div style={styles.headerStyle}>
              {' '}
              Connect to {l1NetworkName} (deposit into Arbitrum)
            </div>
            <div style={styles.textStyle}>
              {' '}
              Connect to Kovan test work to deposit ETH/tokens into Arbitrum
            </div>
          </div>
          <div>
            <img style={styles.gifStyle} src={network.gif} />
          </div>
        </Col>
        <Col>
          <div style={styles.upperSecton}>
            <div style={styles.headerStyle}>
              {' '}
              Connect to {l2NetworkName} (withdraw from Arbitrum)
            </div>
            {/* <Col> */}
            <div style={styles.textStyle}>
              {' '}
              Connect to
              <a
                href="https://developer.offchainlabs.com/docs/Developer_Quickstart/"
                target="_blank"
              >
                {' '}
                your own aggregator
              </a>{' '}
              or to our publically hosted nodes via custom RPC:<br/>{' '}
              <CopyLink
                url={arbV4Testnet.url}
                msg="Arbv3 Aggregator url copied to clipboard"
              />{' '} with chain ID    <CopyLink
              url={arbV4Testnet.chainID.toString()}
              msg="Arbv3 chain ID copied to clipboard"
            /> for Arbv3 
            
            {/* (you probably want this one!) or {" "}
                <CopyLink
                url={arbV2Testnet.url}
                msg="Arbv2 Aggregator url copied to clipboard"
              /> with chain ID <CopyLink
              url={arbV2Testnet.chainID.toString()}
              msg="Arbv2 chainID copied to clipboard"
            />  for Arbv2 (old testnet). */}

            </div>
          </div>
          <img
            className="text-center"
            style={styles.gifStyle}
            src={arbnetwork.gif}
          />
        </Col>
        <Col>
          <div style={styles.upperSecton}>
            <div style={styles.headerStyle}>
              {' '}
              <b>Optional</b>: add Arbitrum block explorer URL
            </div>

            <div style={styles.textStyle}>
              Add our custom block explorer url to Arbitrum network:{' '}
              <CopyLink
                url="https://explorer.arbitrum.io/#"
                msg="Block explorer url copied to clipboard"
              />{`('Settings' > 'Networks' > 'Arbitrum' > 'Block Explorer URL (optional)')`}
            
            </div>
          </div>
          <img className="text-center" style={styles.gifStyle} src={explorer} />
          {/*  */}
          {/* </Row> */}
        </Col>
      </Row>
    </Container>
  )
}

const styles = {
  gifStyle: { maxWidth: 160, border: '1px solid black' },
  textStyle: { fontSize: '10px' },
  headerStyle: {
    fontSize: '12px',
    fontWeight: 500,
    minHeight: 30,
    marginBottom: 10,
    marginTop: 10
  },
  upperSecton: { minHeight: 120, justifyContent: 'center' }
}

const copyTextToClipboard = (str: string) => {
  const el = document.createElement('textarea')
  el.value = str
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}
