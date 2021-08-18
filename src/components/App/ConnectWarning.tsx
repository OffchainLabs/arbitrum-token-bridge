import React from 'react'

import { Alert } from '../common/Alert'
import networks from './networks'

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

const CopyLink = ({ url, msg }: { url: string; msg: string }) => {
  const onClick = (e: any) => {
    e.preventDefault()
    copyTextToClipboard(url)
    alert(msg)
  }
  return (
    <a href="" className="text-bright-blue" onClick={onClick}>
      {url}
    </a>
  )
}

const ConnectWarning = (): JSX.Element => {
  const netWork = networks[4]

  const arbnetwork = networks[netWork.partnerChainID]

  const l1NetworkName = netWork.name
  const l2NetworkName = arbnetwork.name

  return (
    <div className="container mx-auto px-4 text-center text-gray-600">
      <div className="flex justify-center">
        <Alert type="blue">
          {`Connect to ${l1NetworkName} for L1 actions or ${l2NetworkName} for L2 actions`}
        </Alert>
      </div>

      <div className="flex flex-wrap mt-8">
        <div className="flex flex-col items-center w-full md:w-1/3 p-4">
          <div className="flex flex-col flex-grow mb-4">
            <h3 className="text-gray-900 font-semibold mb-2">
              Connect to {l1NetworkName} (deposit into Arbitrum)
            </h3>
            <p>
              Connect to {l2NetworkName} test work to deposit ETH/tokens into
              Arbitrum
            </p>
          </div>
          <div>
            <img
              src={netWork.gif}
              className="max-w-metamaskGif border border-black shadow-lg"
              alt="Metamask explanation"
            />
          </div>
        </div>

        <div className="flex flex-col items-center w-full md:w-1/3 p-4">
          <div className="flex flex-col flex-grow mb-4">
            <h3 className="text-gray-900 font-semibold mb-2">
              Connect to {l2NetworkName} (withdraw from Arbitrum)
            </h3>
            <div>
              Connect to{' '}
              <a
                className="text-bright-blue"
                href="https://developer.offchainlabs.com/docs/Developer_Quickstart/"
                target="_blank"
                rel="noopener noreferrer"
              >
                your own node
              </a>{' '}
              or to our publically hosted nodes via custom RPC:
              <br />{' '}
              <CopyLink
                url={arbnetwork.url}
                msg="node rpc url copied to clipboard"
              />{' '}
              with chain ID{' '}
              <CopyLink
                url={arbnetwork.chainID.toString()}
                msg="Arbv5 chain ID copied to clipboard"
              />{' '}
              for Arbv5
            </div>
          </div>
          <img
            className="max-w-metamaskGif border border-black shadow-lg"
            alt="Arbnetwork explanation"
            src={arbnetwork.gif}
          />
        </div>

        <div className="flex flex-col items-center w-full md:w-1/3 p-4">
          <div className="flex flex-col flex-grow mb-4">
            <h3 className="text-gray-900 font-semibold mb-2">
              <b>Optional</b>: add Arbitrum block explorer URL
            </h3>

            <div>
              Add our custom block explorer url to Arbitrum network:{' '}
              <CopyLink
                url={arbnetwork.explorerUrl}
                msg="Block explorer url copied to clipboard"
              />
              {`('Settings' > 'Networks' > 'Arbitrum' > 'Block Explorer URL (optional)')`}
            </div>
          </div>
          <img
            className="max-w-metamaskGif border border-black shadow-lg"
            alt="Explorer explanation"
            src="/images/explorer.gif"
          />
        </div>
      </div>
    </div>
  )
}

export { ConnectWarning }
