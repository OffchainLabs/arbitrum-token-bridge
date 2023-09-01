import { useState } from 'react'
import { isAddress } from 'ethers/lib/utils.js'
import { Popover } from '@headlessui/react'
import { addCustomChain } from '@arbitrum/sdk'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

import {
  ChainId,
  ChainWithRpcUrl,
  getCustomChainsFromLocalStorage,
  getCustomChainFromLocalStorageById,
  getNetworkName,
  removeCustomChainFromLocalStorage,
  saveCustomChainToLocalStorage,
  validCustomOrbitParentChains
} from '../../util/networks'
import { Loader } from './atoms/Loader'

type Contracts = {
  customGateway: string
  multicall: string
  proxyAdmin: string
  router: string
  standardGateway: string
  weth: string
  wethGateway: string
}

type OrbitConfig = {
  chainInfo: {
    minL2BaseFee: number
    networkFeeReceiver: string
    infrastructureFeeCollector: string
    batchPoster: string
    staker: string
    chainOwner: string
    chainName: string
    chainId: number
    parentChainId: number
    rpcUrl: string
    explorerUrl: string
  }
  coreContracts: {
    rollup: string
    inbox: string
    outbox: string
    adminProxy: string
    sequencerInbox: string
    bridge: string
    utils: string
    validatorWalletCreator: string
  }
  tokenBridgeContracts: {
    l2Contracts: Contracts
    l3Contracts: Contracts
  }
}

function validateAddress(value: string, key: string) {
  if (typeof value !== 'string') {
    throw new Error(`Expected '${key}' to be a string, got ${typeof value}.`)
  }
  if (!isAddress(value)) {
    throw new Error(`'${key}' is not a valid address.`)
  }
}

function validateChainId(chainId: number, key: string) {
  if (typeof chainId !== 'number') {
    throw new Error(`Expected '${key}' to be a number, got ${typeof chainId}.`)
  }
  if (Object.values(ChainId).includes(chainId)) {
    throw new Error(`'${key}' ${chainId} is not a valid custom Orbit chain.`)
  }
  if (getCustomChainFromLocalStorageById(chainId)) {
    throw new Error(
      `'${key}' ${chainId} already added to the custom Orbit chains.`
    )
  }
}

function validateParentChainId(chainId: number, key: string) {
  if (typeof chainId !== 'number') {
    throw new Error(`Expected '${key}' to be a number, got ${typeof chainId}.`)
  }
  if (!validCustomOrbitParentChains.includes(chainId)) {
    throw new Error(
      `'${key}' ${chainId} is not a valid parent chain. Valid parent chains are: ${JSON.stringify(
        validCustomOrbitParentChains
      )}`
    )
  }
}

function validateString(str: string, key: string) {
  if (typeof str !== 'string') {
    throw new Error(`Expected '${key}' to be a string, got ${typeof str}.`)
  }
}

function validateObjectProperty(value: any, key: string) {
  if (typeof value === 'undefined') {
    throw new Error(`Cannot read properties of undefined (reading '${key}')`)
  }
}

function validateOrbitConfig(data: OrbitConfig) {
  // validate object properties individually for better error messages
  validateObjectProperty(data.chainInfo, 'chainInfo')
  validateObjectProperty(data.coreContracts, 'coreContracts')
  validateObjectProperty(data.tokenBridgeContracts, 'tokenBridgeContracts')
  validateObjectProperty(
    data.tokenBridgeContracts.l2Contracts,
    'tokenBridgeContracts[l2Contracts]'
  )
  validateObjectProperty(
    data.tokenBridgeContracts.l3Contracts,
    'tokenBridgeContracts[l3Contracts]'
  )

  // chainInfo
  validateChainId(data.chainInfo.chainId, 'chainInfo[chainId]')
  validateParentChainId(
    data.chainInfo.parentChainId,
    'chainInfo[parentChainId]'
  )
  validateString(data.chainInfo.rpcUrl, 'chainInfo[rpcUrl]')
  validateString(data.chainInfo.explorerUrl, 'chainInfo[explorerUrl]')
  validateString(data.chainInfo.chainName, 'chainInfo[chainName]')

  // coreContracts
  validateAddress(data.coreContracts.bridge, 'coreContracts[bridge]')
  validateAddress(data.coreContracts.inbox, 'coreContracts[inbox]')
  validateAddress(data.coreContracts.outbox, 'coreContracts[outbox]')
  validateAddress(data.coreContracts.rollup, 'coreContracts[rollup]')
  validateAddress(
    data.coreContracts.sequencerInbox,
    'coreContracts[sequencerInbox]'
  )

  // tokenBridgeContracts
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.customGateway,
    'tokenBridgeContracts[l2Contracts][customGateway]'
  )
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.standardGateway,
    'tokenBridgeContracts[l2Contracts][standardGateway]'
  )
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.router,
    'tokenBridgeContracts[l2Contracts][router]'
  )
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.multicall,
    'tokenBridgeContracts[l2Contracts][multicall]'
  )
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.proxyAdmin,
    'tokenBridgeContracts[l2Contracts][proxyAdmin]'
  )
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.weth,
    'tokenBridgeContracts[l2Contracts][weth]'
  )
  validateAddress(
    data.tokenBridgeContracts.l2Contracts.wethGateway,
    'tokenBridgeContracts[l2Contracts][wethGateway]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.customGateway,
    'tokenBridgeContracts[l3Contracts][customGateway]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.standardGateway,
    'tokenBridgeContracts[l3Contracts][standardGateway]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.router,
    'tokenBridgeContracts[l3Contracts][router]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.multicall,
    'tokenBridgeContracts[l3Contracts][multicall]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.proxyAdmin,
    'tokenBridgeContracts[l3Contracts][proxyAdmin]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.weth,
    'tokenBridgeContracts[l3Contracts][weth]'
  )
  validateAddress(
    data.tokenBridgeContracts.l3Contracts.wethGateway,
    'tokenBridgeContracts[l3Contracts][wethGateway]'
  )
}

function mapOrbitConfigToOrbitChain(data: OrbitConfig): ChainWithRpcUrl {
  return {
    chainID: data.chainInfo.chainId,
    confirmPeriodBlocks: 150,
    ethBridge: {
      bridge: data.coreContracts.bridge,
      inbox: data.coreContracts.inbox,
      outbox: data.coreContracts.outbox,
      rollup: data.coreContracts.rollup,
      sequencerInbox: data.coreContracts.sequencerInbox
    },
    rpcUrl: data.chainInfo.rpcUrl,
    explorerUrl: data.chainInfo.explorerUrl,
    isCustom: true,
    name: data.chainInfo.chainName,
    partnerChainID: data.chainInfo.parentChainId,
    retryableLifetimeSeconds: 604800,
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 900000,
    isArbitrum: true,
    tokenBridge: {
      l1CustomGateway: data.tokenBridgeContracts.l2Contracts.customGateway,
      l1ERC20Gateway: data.tokenBridgeContracts.l2Contracts.standardGateway,
      l1GatewayRouter: data.tokenBridgeContracts.l2Contracts.router,
      l1MultiCall: data.tokenBridgeContracts.l2Contracts.multicall,
      l1ProxyAdmin: data.tokenBridgeContracts.l2Contracts.proxyAdmin,
      l1Weth: data.tokenBridgeContracts.l2Contracts.weth,
      l1WethGateway: data.tokenBridgeContracts.l2Contracts.wethGateway,
      l2CustomGateway: data.tokenBridgeContracts.l3Contracts.customGateway,
      l2ERC20Gateway: data.tokenBridgeContracts.l3Contracts.standardGateway,
      l2GatewayRouter: data.tokenBridgeContracts.l3Contracts.router,
      l2Multicall: data.tokenBridgeContracts.l3Contracts.multicall,
      l2ProxyAdmin: data.tokenBridgeContracts.l3Contracts.proxyAdmin,
      l2Weth: data.tokenBridgeContracts.l3Contracts.weth,
      l2WethGateway: data.tokenBridgeContracts.l3Contracts.wethGateway
    }
  }
}

export const AddCustomChain = () => {
  const [chainJson, setChainJson] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [addingChain, setAddingChain] = useState(false)

  const customChains = getCustomChainsFromLocalStorage()

  function onAddChain() {
    setAddingChain(true)
    setError(null)

    try {
      const data = JSON.parse(
        chainJson.trim().replace(/[\r\n]+/g, '')
      ) as OrbitConfig

      if (!data) {
        throw new Error('JSON input is empty.')
      }

      validateOrbitConfig(data)
      const customChain = mapOrbitConfigToOrbitChain(data)

      // Orbit config has been validated and will be added to the custom list after page refreshes
      // let's still try to add it here to handle eventual errors
      addCustomChain({ customChain: customChain })

      saveCustomChainToLocalStorage(customChain)
      // reload to apply changes
      location.reload()
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong.')
      setAddingChain(false)
    }
  }

  return (
    <>
      <textarea
        onChange={e => setChainJson(e.target.value)}
        placeholder="Insert your Orbit JSON Config here."
        className="min-h-[100px] w-full rounded-lg px-4 py-2 text-sm font-light text-black"
      />
      {error && <span className="text-sm text-error">{error}</span>}
      <div className="flex w-full justify-end">
        {addingChain ? (
          <Loader size="small" />
        ) : (
          // Need to replace with an atom
          <button
            onClick={onAddChain}
            className="rounded bg-white p-2 text-sm text-black transition-all hover:opacity-80 disabled:pointer-events-none	"
            disabled={!chainJson.trim()}
          >
            Add Chain
          </button>
        )}
      </div>

      {/* Custom chain list */}
      {customChains.length > 0 && (
        <div className="mt-4">
          <div className="heading mb-4 text-lg">Live Orbit Chains</div>
          <table className="w-full text-left">
            <thead className="border-b border-gray-600">
              <tr>
                <th className="pb-1 text-xs font-normal">ORBIT CHAIN</th>
                <th className="pb-1 text-xs font-normal">ORBIT CHAIN ID</th>
                <th className="pb-1 text-xs font-normal">PARENT CHAIN</th>
                <th className="pb-1 text-xs font-normal">PARENT CHAIN ID</th>
                <th className="pb-1 text-xs font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {customChains.map(customChain => (
                <tr
                  key={customChain.chainID}
                  className="border-b border-gray-600"
                >
                  <th className="py-3 text-sm font-normal">
                    {customChain.name}
                  </th>
                  <th className="py-3 text-sm font-normal">
                    {customChain.chainID}
                  </th>
                  <th className="py-3 text-sm font-normal">
                    {getNetworkName(customChain.partnerChainID)}
                  </th>
                  <th className="py-3 text-sm font-normal">
                    {customChain.partnerChainID}
                  </th>
                  <th className="py-3">
                    <Popover className="relative">
                      <Popover.Button>
                        <EllipsisHorizontalIcon width={20} />
                      </Popover.Button>
                      <Popover.Panel className="absolute bottom-6 right-0 flex w-52 flex-col rounded bg-white text-xs font-normal text-black">
                        <button
                          className="rounded p-4 text-left hover:bg-gray-3"
                          onClick={() => {
                            removeCustomChainFromLocalStorage(
                              customChain.chainID
                            )
                            // reload to apply changes
                            location.reload()
                          }}
                        >
                          Delete this chain
                        </button>
                        <a
                          className="rounded p-4 text-left hover:bg-gray-3"
                          href={`data:text/json;charset=utf-8,${encodeURIComponent(
                            JSON.stringify(customChain)
                          )}`}
                          download={`${customChain.name
                            .split(' ')
                            .join('')}.json`}
                        >
                          Download config for this chain
                        </a>
                      </Popover.Panel>
                    </Popover>
                  </th>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
