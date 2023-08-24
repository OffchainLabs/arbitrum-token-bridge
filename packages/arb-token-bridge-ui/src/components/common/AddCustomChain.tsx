import { useState } from 'react'
import Tippy from '@tippyjs/react'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { Chain } from '@arbitrum/sdk'

import { Button } from './Button'
import { ChainWithRpcUrl, getNetworkName } from '../../util/networks'

export const localStorageKey = 'arbitrum-custom-chains'

// allow only Ethereum testnets and Arbitrum testnets as parent chains
const allowedParentChainIds = [5, 11155111, 1337, 421613, 421614, 412346]

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
export function getCustomChainsFromLocalStorage(): ChainWithRpcUrl[] {
  const customNetworksFromLocalStorage = localStorage.getItem(localStorageKey)

  if (customNetworksFromLocalStorage) {
    return (JSON.parse(customNetworksFromLocalStorage) as ChainWithRpcUrl[])
      .filter(
        // filter again in case local storage is compromized
        chain => !allowedParentChainIds.includes(Number(chain.chainID))
      )
      .map(chain => {
        return {
          ...chain,
          // make sure chainID is numeric
          chainID: Number(chain.chainID)
        }
      })
  }

  return []
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
  const [customChains, setCustomChains] = useState<Chain[]>(
    getCustomChainsFromLocalStorage()
  )
  const [chainJson, setChainJson] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isDeleteConfirmation, setIsDeleteConfirmation] = useState(false)

  function onAddChain() {
    setError(null)

    try {
      const data = (
        chainJson.trim()
          ? JSON.parse(chainJson.replace(/[\r\n]+/g, ''))
          : undefined
      ) as OrbitConfig

      if (!data) {
        throw new Error('JSON input is empty.')
      }

      const customChain = mapOrbitConfigToOrbitChain(data)

      if (!allowedParentChainIds.includes(Number(customChain.partnerChainID))) {
        throw new Error(
          `Invalid partnerChainID ${customChain.partnerChainID}. Only Ethereum testnet and Arbitrum testnet parent chains are allowed.`
        )
      }

      customChain.isCustom = true

      saveCustomChainToLocalStorage(customChain)
      // reload to apply changes
      location.reload()
    } catch (error: any) {
      setError(error.message ?? 'Something went wrong.')
    }
  }

  function saveCustomChainToLocalStorage(newCustomChain: ChainWithRpcUrl) {
    const newCustomChains = [
      ...getCustomChainsFromLocalStorage(),
      newCustomChain
    ]
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomChains))
    setCustomChains(newCustomChains)
  }

  function removeCustomChainFromLocalStorage(chainId: number) {
    const newCustomChains = getCustomChainsFromLocalStorage().filter(
      chain => chain.chainID !== chainId
    )
    localStorage.setItem(localStorageKey, JSON.stringify(newCustomChains))
    setCustomChains(newCustomChains)
  }

  return (
    <>
      <textarea
        onChange={e => setChainJson(e.target.value)}
        placeholder="Insert your Orbit JSON Config"
        className="min-h-[100px] w-full rounded-lg p-1 text-black"
      />
      {error && <span className="text-sm text-error">{error}</span>}
      <div className="flex w-full justify-end">
        <Button
          onClick={onAddChain}
          variant="primary"
          className="bg-white text-black"
        >
          Add Chain
        </Button>
      </div>

      {/* Custom chain list */}
      {customChains.length > 0 && (
        <div className="mt-4">
          <div className="heading mb-4 text-lg">Live Orbit Chains</div>
          <table className="w-full text-left">
            <thead className="border-b border-gray-600">
              <tr>
                <th className="pb-1 text-xs font-normal">PARENT CHAIN</th>
                <th className="pb-1 text-xs font-normal">PARENT CHAIN ID</th>
                <th className="pb-1 text-xs font-normal">ORBIT CHAIN</th>
                <th className="pb-1 text-xs font-normal">ORBIT CHAIN ID</th>
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
                    {getNetworkName(customChain.partnerChainID)}
                  </th>
                  <th className="py-3 text-sm font-normal">
                    {customChain.partnerChainID}
                  </th>
                  <th className="py-3 text-sm font-normal">
                    {customChain.name}
                  </th>
                  <th className="py-3 text-sm font-normal">
                    {customChain.chainID}
                  </th>
                  <th className="py-3 ">
                    <Tippy
                      arrow={false}
                      interactive
                      onHidden={() => setIsDeleteConfirmation(false)}
                      content={
                        <div className="flex flex-col font-normal">
                          <a
                            className="py-2 text-left"
                            href={`data:text/json;charset=utf-8,${encodeURIComponent(
                              JSON.stringify(customChain)
                            )}`}
                            download={`${customChain.name
                              .split(' ')
                              .join('')}.json`}
                          >
                            Download config
                          </a>
                          <button
                            className="py-2 text-left text-red-500"
                            onClick={
                              isDeleteConfirmation
                                ? () => {
                                    removeCustomChainFromLocalStorage(
                                      customChain.chainID
                                    )
                                    // reload to apply changes
                                    location.reload()
                                  }
                                : () => setIsDeleteConfirmation(true)
                            }
                          >
                            {isDeleteConfirmation ? 'Sure?' : 'Delete'}
                          </button>
                        </div>
                      }
                    >
                      <EllipsisHorizontalIcon width={20} />
                    </Tippy>
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
