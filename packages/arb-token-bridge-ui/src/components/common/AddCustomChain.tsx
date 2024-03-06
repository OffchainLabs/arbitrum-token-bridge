import { useState } from 'react'
import { isAddress } from 'ethers/lib/utils.js'
import { Popover } from '@headlessui/react'
import {
  addCustomNetwork,
  constants as arbitrumSdkConstants
} from '@arbitrum/sdk'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { constants } from 'ethers'
import { z } from 'zod'
import { RollupAdminLogic__factory } from '@arbitrum/sdk/dist/lib/abi/factories/RollupAdminLogic__factory'

import {
  ChainId,
  ChainWithRpcUrl,
  getCustomChainsFromLocalStorage,
  getCustomChainFromLocalStorageById,
  getNetworkName,
  removeCustomChainFromLocalStorage,
  saveCustomChainToLocalStorage,
  supportedCustomOrbitParentChains,
  rpcURLs
} from '../../util/networks'
import { Loader } from './atoms/Loader'
import { Erc20Data, fetchErc20Data } from '../../util/TokenUtils'
import { getProviderForChainId } from '../../hooks/useNetworks'
import { Transition } from './Transition'
import { Button } from './Button'

const orbitConfigsLocalStorageKey = 'arbitrum:orbit:configs'

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
    nativeToken?: string
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

const zAddress = z
  .string()
  .refine(address => isAddress(address), 'Invalid address')

const zChainId = z
  .number()
  .int()
  .positive()
  .refine(
    chainId => !Object.values(ChainId).includes(chainId),
    'Invalid custom Orbit chain ID'
  )
  .refine(
    chainId => !getCustomChainFromLocalStorageById(chainId),
    'Custom chain already added'
  )

const zParentChainId = z
  .number()
  .int()
  .positive()
  .refine(
    chainId => supportedCustomOrbitParentChains.includes(chainId),
    'Unsupported parent chain ID'
  )

const zContract = z.object({
  customGateway: zAddress,
  multicall: zAddress,
  proxyAdmin: zAddress,
  router: zAddress,
  standardGateway: zAddress,
  weth: zAddress,
  wethGateway: zAddress
})

const ZodOrbitConfig = z.object({
  chainInfo: z.object({
    minL2BaseFee: z.number().nonnegative().int(),
    networkFeeReceiver: zAddress,
    infrastructureFeeCollector: zAddress,
    batchPoster: zAddress,
    staker: zAddress,
    chainOwner: zAddress,
    chainName: z.string(),
    chainId: zChainId,
    parentChainId: zParentChainId,
    rpcUrl: z.string().url(),
    explorerUrl: z.string().url(),
    nativeToken: zAddress.optional()
  }),
  coreContracts: z.object({
    rollup: zAddress,
    inbox: zAddress,
    outbox: zAddress,
    adminProxy: zAddress,
    sequencerInbox: zAddress,
    bridge: zAddress,
    utils: zAddress,
    validatorWalletCreator: zAddress
  }),
  tokenBridgeContracts: z.object({
    l2Contracts: zContract,
    l3Contracts: zContract
  })
})

function getOrbitConfigsFromLocalStorage(): OrbitConfig[] {
  const configs = localStorage.getItem(orbitConfigsLocalStorageKey)

  if (!configs) {
    return []
  }

  return JSON.parse(configs)
}

function getOrbitConfigFromLocalStorageById(
  chainId: ChainId
): OrbitConfig | undefined {
  const configs = getOrbitConfigsFromLocalStorage()
  return configs.find(config => config.chainInfo.chainId === chainId)
}

function removeOrbitConfigFromLocalStorage(chainId: ChainId) {
  const configs = getOrbitConfigsFromLocalStorage()
  const newConfigs = configs.filter(
    config => config.chainInfo.chainId !== chainId
  )
  localStorage.setItem(orbitConfigsLocalStorageKey, JSON.stringify(newConfigs))
}

function saveOrbitConfigToLocalStorage(data: OrbitConfig) {
  const configs = getOrbitConfigsFromLocalStorage()
  localStorage.setItem(
    orbitConfigsLocalStorageKey,
    JSON.stringify([...configs, data])
  )
}

async function mapOrbitConfigToOrbitChain(
  data: OrbitConfig
): Promise<ChainWithRpcUrl> {
  const rollup = RollupAdminLogic__factory.connect(
    data.coreContracts.rollup,
    getProviderForChainId(data.chainInfo.parentChainId)
  )
  const confirmPeriodBlocks =
    (await rollup.confirmPeriodBlocks()).toNumber() ?? 150
  return {
    chainID: data.chainInfo.chainId,
    confirmPeriodBlocks,
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
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 900000,
    blockTime: arbitrumSdkConstants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
    nativeToken: data.chainInfo.nativeToken,
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

async function fetchNativeToken(
  data: OrbitConfig
): Promise<
  | { nativeToken: undefined; nativeTokenData: undefined }
  | { nativeToken: string; nativeTokenData: Erc20Data }
> {
  const nativeToken = data.chainInfo.nativeToken
  const nativeTokenIsEther =
    typeof nativeToken === 'undefined' || nativeToken === constants.AddressZero

  if (nativeTokenIsEther) {
    return { nativeToken: undefined, nativeTokenData: undefined }
  }

  const nativeTokenData = await fetchErc20Data({
    address: nativeToken,
    provider: new StaticJsonRpcProvider(rpcURLs[data.chainInfo.parentChainId])
  })

  return { nativeToken, nativeTokenData }
}

export const AddCustomChain = () => {
  const [chainJson, setChainJson] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [addingChain, setAddingChain] = useState(false)

  const customChains = getCustomChainsFromLocalStorage()

  async function onAddChain() {
    setAddingChain(true)
    setError(null)

    try {
      const data = JSON.parse(
        chainJson.trim().replace(/[\r\n]+/g, '')
      ) as OrbitConfig

      if (!data) {
        throw new Error('JSON input is empty.')
      }

      // validate config
      ZodOrbitConfig.parse(data)

      const customChain = await mapOrbitConfigToOrbitChain(data)
      const nativeToken = await fetchNativeToken(data)
      // Orbit config has been validated and will be added to the custom list after page refreshes
      // let's still try to add it here to handle eventual errors
      addCustomNetwork({ customL2Network: customChain })
      saveCustomChainToLocalStorage({ ...customChain, ...nativeToken })
      saveOrbitConfigToLocalStorage(data)
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
        placeholder="Paste the JSON configuration from the 'outputInfo.json' file that's generated at the end of the custom Orbit chain deployment."
        className="min-h-[154px] w-full rounded border border-gray-dark bg-dark p-4 text-sm font-light text-white placeholder:text-white/70"
      />
      {error && (
        <div className="relative">
          <pre className="scroll mb-2 max-h-[400px] overflow-auto rounded border border-gray-dark bg-dark p-4 text-sm text-error">
            <button
              onClick={() => setError(null)}
              className="arb-hover absolute right-4 top-4 text-white"
            >
              <XMarkIcon width={20} />
            </button>
            {error}
          </pre>
        </div>
      )}
      <div className="flex w-full justify-end">
        {addingChain ? (
          <Loader size="small" color="white" />
        ) : (
          <Button
            variant="secondary"
            onClick={onAddChain}
            disabled={!chainJson.trim()}
          >
            Add Chain
          </Button>
        )}
      </div>

      {/* Custom chain list */}
      {customChains.length > 0 && !addingChain && (
        <div className="mt-4">
          <div className="heading mb-4 text-lg">Live Orbit Chains</div>
          <table className="w-full text-left">
            <thead className="border-b border-gray-dark">
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
                  className="border-b border-gray-dark"
                >
                  <th className="max-w-[100px] truncate py-3 text-sm font-normal">
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
                      <Popover.Button className="arb-hover">
                        <EllipsisHorizontalIcon width={20} />
                      </Popover.Button>
                      <Transition>
                        <Popover.Panel className="absolute bottom-6 right-0 flex w-[240px] flex-col rounded border border-gray-dark bg-dark text-sm font-normal text-white">
                          <button
                            className="rounded-t p-4 text-left transition duration-300 hover:bg-[#333333]"
                            onClick={() => {
                              removeCustomChainFromLocalStorage(
                                customChain.chainID
                              )
                              removeOrbitConfigFromLocalStorage(
                                customChain.chainID
                              )
                              // reload to apply changes
                              location.reload()
                            }}
                          >
                            Delete this chain
                          </button>
                          <a
                            className="rounded-b p-4 text-left transition duration-300 hover:bg-[#333333]"
                            href={`data:text/json;charset=utf-8,${encodeURIComponent(
                              JSON.stringify(
                                getOrbitConfigFromLocalStorageById(
                                  customChain.chainID
                                )
                              )
                            )}`}
                            download={`${customChain.name
                              .split(' ')
                              .join('')}.json`}
                          >
                            Download config for this chain
                          </a>
                        </Popover.Panel>
                      </Transition>
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
