import React, { useEffect, useState, useMemo, useCallback } from 'react'

import { BridgeHelper, Inbox__factory } from 'arb-ts'
import { utils, constants } from 'ethers'
import { Bridge } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

const UnsupportedSmartContractWalletDisplay = ({
  bridge
}: {
  bridge: Bridge | null
}): JSX.Element => {
  if (!bridge) {
    return <>...</>
  }
  const {
    app: { networkDetails }
  } = useAppState()
  const [recoverableEth, setRecoverableEth] = useState(constants.Zero)
  const [recoveryAddress, setRecoveryAddress] = useState('')

  useEffect(() => {
    const checkReverableEth = async () => {
      const l1ContractAddress = await bridge.l1Bridge.getWalletAddress()
      const l2Alias = utils.hexValue(
        BridgeHelper.applyL1ToL2Alias(l1ContractAddress)
      )
      const recoverableEthBalance = await bridge.l2Provider.getBalance(l2Alias)
      setRecoverableEth(recoverableEthBalance)
    }
    checkReverableEth()
  }, [bridge])

  const readableEth = useMemo(() => {
    return utils.formatEther(recoverableEth)
  }, [recoverableEth])

  const recover = useCallback(
    async e => {
      e.preventDefault()
      if (networkDetails?.isArbitrum) {
        return alert('Connect to L1')
      }

      const inboxAddress =
        bridge.l1Bridge.network.ethBridge &&
        bridge.l1Bridge.network.ethBridge.inbox
      if (!inboxAddress) throw new Error('no inbox address for current network')

      const l1ContractAddress = await bridge.l1Bridge.getWalletAddress()
      const l2Alias = utils.hexValue(
        BridgeHelper.applyL1ToL2Alias(l1ContractAddress)
      )
      const retryableParams = await bridge.getRetryableTxnParams(
        '0x',
        l2Alias,
        recoveryAddress,
        recoverableEth
      )
      const inbox = Inbox__factory.connect(inboxAddress, bridge.l1Signer)
      const res = await inbox.createRetryableTicketNoRefundAliasRewrite(
        recoveryAddress,
        recoverableEth,
        retryableParams.submissionPriceBid,
        recoveryAddress,
        recoveryAddress,
        retryableParams.maxGasBid,
        retryableParams.gasPriceBid,
        '',
        { value: retryableParams.totalDepositValue }
      )
      await res.wait()
      alert(
        'Your transfer has been initiated from the L1 and will redeemable in ~10 minutes'
      )
    },
    [recoverableEth, recoveryAddress, bridge, networkDetails]
  )

  return recoverableEth.gt(constants.Zero) ? (
    <form onSubmit={recover} className="flex flex-col">
      <label
        htmlFor="recoveryAddress"
        className="text-sm leading-5 font-medium text-gray-700 mb-1"
      >
        Looks like you have {readableEth} Ether to recover from your smart
        contract wallet
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id="recoveryAddress"
          value={recoveryAddress}
          onChange={e => setRecoveryAddress(e.target.value)}
          placeholder={`paste address to send your ${readableEth} to on L2`}
          className="text-dark-blue shadow-sm border border-gray-300 rounded-md px-2 w-full h-10"
        />
        <Button
          variant="white"
          type="submit"
          disabled={recoveryAddress === '' || !utils.isAddress(recoveryAddress)}
          className="flex items-center justify-center bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 p-2 min-w-16"
        >
          submit
        </Button>
      </div>
    </form>
  ) : (
    <Alert type="red">
      Looks like your wallet is connected to a contract; please connect to an
      externally owned account instead.
    </Alert>
  )
}

export { UnsupportedSmartContractWalletDisplay }
