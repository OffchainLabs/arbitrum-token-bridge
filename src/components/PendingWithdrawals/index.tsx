import { utils } from 'ethers'
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { PendingWithdrawalsMap, L2ToL1EventResultPlus } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'
import { providers } from 'ethers'
import { OutgoingMessageState } from 'arb-ts'
import networks from '../App/networks'
interface PendingWithdrawalsProps {
  pendingWithdrawalsMap: PendingWithdrawalsMap
  filter: (data: L2ToL1EventResultPlus) => boolean
  headerText: string
  triggerOutbox: (id: string) => {} | undefined
  ethProvider: providers.Provider
  decimals?: number
  // Header
}
const { formatUnits } = utils
const disputePeriodBlocks = 900
const PendingWithdrawals = ({
  pendingWithdrawalsMap,
  filter,
  headerText,
  triggerOutbox,
  ethProvider,
  decimals = 18
}: PendingWithdrawalsProps) => {
  const [currentTime, setCurrentTime] = useState(0)
  const [currentL1BlockNumber, setCurrentL1BlockNumber] = useState(0)
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

  const calcTimeRemaining = useCallback(
    (timestamp: number) => {
      if (currentTime === 0) {
        return '...'
      }
      const ellapsedTime = Math.floor((currentTime - timestamp) / 60)
      const totalTimeMinutes = 48 * 60
      return Math.max(0, totalTimeMinutes - ellapsedTime)
    },
    [currentTime]
  )
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
    const { outgoingMessageState, ethBlockNum, indexInBatch, batchNumber } = pw

    const blocksRemaining = Math.max(
      disputePeriodBlocks - (currentL1BlockNumber - ethBlockNum.toNumber()),
      0
    )
    switch (outgoingMessageState) {
      case OutgoingMessageState.NOT_FOUND:
      case OutgoingMessageState.UNCONFIRMED:
        const blocksDisplay =
          blocksRemaining > 0
            ? `~${blocksRemaining} blocks (~${blocksRemaining / 4} minutes)`
            : `any minute!`
        return <span>Unconfirmed: ETA: {blocksDisplay} </span>

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
      <Table className="pw-table" striped bordered>
        <thead>
          <tr>{headerText}</tr>
          <tr>
            <th>value</th>
            <th>status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pendingWithdrawalsToShow.map((pw: L2ToL1EventResultPlus) => {
            const id = pw.uniqueId.toString()

            return (
              <tr key={id}>
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
