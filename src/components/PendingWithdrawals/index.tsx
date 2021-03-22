import { utils } from 'ethers'
import React, { useMemo, useState, useEffect } from 'react'
import { PendingWithdrawalsMap, L2ToL1EventResultPlus } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'

interface PendingWithdrawalsProps {
  pendingWithdrawalsMap: PendingWithdrawalsMap
  filter: (data: L2ToL1EventResultPlus) => boolean
  headerText: string
  triggerClaim: (id: string) => void
  // Header
}
const { formatEther } = utils

const PendingWithdrawals = ({
  pendingWithdrawalsMap,
  filter,
  headerText,
  triggerClaim
}: PendingWithdrawalsProps) => {
  const [currentTime, setCurrentTime] = useState(0)
  useEffect(()=>{
    window.setInterval(()=>{
      setCurrentTime(new Date().getTime())
    }, 1000)
  },[])
  //  sort, include id in data, and filter out target PWs
  const pendingWithdrawalsToShow = useMemo(() => {
    return Object.keys(pendingWithdrawalsMap)
      .sort()
      .map(id => {
        return pendingWithdrawalsMap[id]
      })
      .filter(filter)
  }, [pendingWithdrawalsMap])
  return (
    <div>
      <Table className="pw-table" striped bordered>
        <thead>
          <tr>{headerText}</tr>
          <tr>
            <th>value</th>
            <th>time remaining</th>
            <th></th>

          </tr>
        </thead>
        <tbody>
          {pendingWithdrawalsToShow.map(pw => {
            return (
              <tr>
                <td>{pw.value.toString()}</td>

                <td>{pw.timestamp}</td>
                <td><button onClick={()=>triggerClaim(pw.uniqueId.toString())}>claim</button></td>

              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

export default PendingWithdrawals
