import { utils } from 'ethers'
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { PendingWithdrawalsMap, L2ToL1EventResultPlus } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'
import { providers } from 'ethers'
import { OutgoingMessageState } from 'arb-ts'
import { useL1Network, useL2Network } from 'components/App/NetworkContext'
import Spinner from  'react-bootstrap/Spinner'
import { PendingWithdrawalsLoadedState } from 'util/index'

interface PendingWithdrawalsProps {
  pendingWithdrawalsMap: PendingWithdrawalsMap
  filter: (data: L2ToL1EventResultPlus) => boolean
  headerText: string
  triggerOutbox: (id: string) => {} | undefined
  ethProvider: providers.Provider
  pwLoadedState: PendingWithdrawalsLoadedState
  // Header
}
const { formatUnits } = utils

interface StatusProps {
    text: string,
    pwLoadedState: PendingWithdrawalsLoadedState
}
const StatusDisplay = ({text, pwLoadedState}: StatusProps) => {
  if (pwLoadedState === PendingWithdrawalsLoadedState.LOADING){
    return <div className="row"><i>Loading {text} </i> <Spinner role="status" animation="border"></Spinner> </div>

  } else if ( pwLoadedState === PendingWithdrawalsLoadedState.ERROR){
      return <div className="row" style={{color: "darkred"}}> Fetching pending withdrawals timed out; refresh/ try again shortly </div>
  } else {
    return null
  }
}

const PendingWithdrawals = ({
  pendingWithdrawalsMap,
  filter,
  headerText,
  triggerOutbox,
  ethProvider,
  pwLoadedState
}: PendingWithdrawalsProps) => {
  const [currentL1BlockNumber, setCurrentL1BlockNumber] = useState(0)
  const { confirmPeriodBlocks = 45818 } = useL2Network()
  const { blockTime = 15 } = useL1Network()

  useEffect(() => {
    ethProvider.on('block', (blockNumber: number) => {
      console.info('l1 blockNumber:', blockNumber)

      setCurrentL1BlockNumber(blockNumber)
    })
  }, [])

  const handleTriggerOutbox = useCallback(
    async (id: string) => {
      // if (timestamp !== 0){
      //   return alert("Can't claim this withdrawal yet; try again later")
      // }
      const res = await triggerOutbox(id)
      if (!res) {
        alert("Can't claim this withdrawal yet; try again later")
      }
    },
    [triggerOutbox]
  )
  const calcEtaDisplay = (blocksRemaining: number) => {
    const minutesLeft = Math.round((blocksRemaining * blockTime) / 60)
    const hoursLeft = Math.round(minutesLeft / 60)
    const daysLeft = Math.round(hoursLeft / 24)

    if (daysLeft > 0) {
      return `~${blocksRemaining} blocks (~${daysLeft} day${
        daysLeft === 1 ? '' : 's'
      })`
    }

    if (hoursLeft > 0) {
      return `~${blocksRemaining} blocks (~${hoursLeft} hour${
        hoursLeft === 1 ? '' : 's'
      })`
    }

    if (minutesLeft === 0) {
      return 'any minute!'
    }

    return `~${blocksRemaining} blocks (~${minutesLeft} minute${
      minutesLeft === 1 ? '' : 's'
    })`
  }
  //  sort, include id in data, and filter out target PWs // sort by ts
  const pendingWithdrawalsToShow = useMemo(() => {
    return Object.keys(pendingWithdrawalsMap)
      .sort()
      .map(id => {
        return pendingWithdrawalsMap[id]
      })
      .filter(filter)
  }, [pendingWithdrawalsMap])

  const statusDisplay = (pw: L2ToL1EventResultPlus) => {
    const { outgoingMessageState, ethBlockNum } = pw

    const blocksRemaining = Math.max(
      confirmPeriodBlocks - (currentL1BlockNumber - ethBlockNum.toNumber()),
      0
    )
    switch (outgoingMessageState) {
      case OutgoingMessageState.NOT_FOUND:
      case OutgoingMessageState.UNCONFIRMED:
        const etaDisplay = calcEtaDisplay(blocksRemaining)
        return <span>Unconfirmed: ETA: {etaDisplay} </span>

        break
      case OutgoingMessageState.CONFIRMED:
        return (
          <span>
            Confirmed!{' '}
            <button onClick={() => handleTriggerOutbox(pw.uniqueId.toString())}>
              claim
            </button>
          </span>
        )
      case OutgoingMessageState.EXECUTED:
        return (
          <span>
            <i>Already claimed </i>
          </span>
        )
    }
  }
  return (
    <div>
          <StatusDisplay
            text={headerText}
            pwLoadedState={pwLoadedState}
          />
      <Table className="pw-table" striped bordered>
        <thead>
          <tr>{headerText}</tr>
          <tr>
            <th>asset</th>
            <th>value</th>

            <th>status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pendingWithdrawalsToShow.map((pw: L2ToL1EventResultPlus) => {
            const id = pw.uniqueId.toString()
            const {decimals} = pw

            return (
              <tr key={id}>
                <td>{pw.symbol}</td>
                <td>{formatUnits(pw.value.toString(), decimals)}</td>
                <td>{statusDisplay(pw)}</td>
                <td></td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

export default PendingWithdrawals
