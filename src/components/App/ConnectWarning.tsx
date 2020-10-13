import React from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import Alert from 'react-bootstrap/Alert'
import networks from './networks'
import copy from 'media/images/copy.jpg'

const ethNetworkId = process.env.REACT_APP_ETH_NETWORK_ID as string
const arbNetworkId = process.env.REACT_APP_ARB_NETWORK_ID as string
const gifStyle = { maxWidth: 200, border: '1px solid black' }
export default () => {
  const network = networks[+ethNetworkId]
  const arbnetwork = networks[+arbNetworkId]

  const l1NetworkName = networks[+ethNetworkId].name
  const l2NetworkName = networks[+arbNetworkId].name
  const onClick = (e:any) =>{
    e.preventDefault()
    copyTextToClipboard('https://node.offchainlabs.com:8547')
    alert('Aggregator url copied to clipboard')
  }
  return (
    <Container>
      <Alert variant={'primary'}>
        {' '}
        {`Connect to ${l1NetworkName} for L1 actions or ${l2NetworkName} for L2 actions`}
      </Alert>
      <Row>
        <Col style={{ border: '0px solid black' }} className="text-center">
          {' '}
          <h5> {l1NetworkName} (deposit into Arbitrum)</h5>
          <div style={{ minHeight: '50px' }}> </div>
          <img style={gifStyle} src={network.gif} />
        </Col>
        <Col style={{ border: '0px solid black' }} className="text-center">
          <h5> {l2NetworkName} (withdraw from Arbitrum)</h5>
          <div style={{ minHeight: '50px', fontSize: '12px' }}>
            {' '}
            Connect to
            <a
              href="https://developer.offchainlabs.com/docs/Developer_Quickstart/"
              target="_blank"
            >
              {' '}
              your own aggregator
            </a>{' '}
            or to our publically hosted node at{' '} <br/>
            <a href="" onClick={onClick}> <img width={10} src={copy }/> https://node.offchainlabs.com:8547</a> via Custom RPC:
          </div>
          <img style={gifStyle} src={arbnetwork.gif} />
        </Col>
      </Row>
    </Container>
  )
}



function fallbackCopyTextToClipboard(text:string) {
  var textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}
function copyTextToClipboard(text:string) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}
