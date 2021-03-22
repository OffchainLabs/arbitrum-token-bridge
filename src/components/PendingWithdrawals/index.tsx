import { utils } from 'ethers'
import React, { useMemo, useState, useEffect } from 'react'
import { PendingWithdrawalsMap, L2ToL1EventResultPlus } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'

interface PendingWithdrawalsProps {
  pendingWithdrawalsMap: PendingWithdrawalsMap
  filter: (data: L2ToL1EventResultPlus) => boolean
  headerText: string
  triggerOutbox: (id: string) => {} | undefined
  // Header
}
const { formatEther } = utils

const PendingWithdrawals = ({
  pendingWithdrawalsMap,
  filter,
  headerText,
  triggerOutbox
}: PendingWithdrawalsProps) => {

  const handleTriggerOutbox = async  (id: string)=>{
    const res = await triggerOutbox(id)
    if (!res){
      alert("Can't claim this withdrawal yet; try again later")
    }
  }
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
            <th>created</th>
            <th></th>

          </tr>
        </thead>
        <tbody>
          {pendingWithdrawalsToShow.map(pw => {
            const id = pw.uniqueId.toString()
            return (
              <tr key={id}>
                <td>{formatEther(pw.value.toString())}</td>
                <td>{pw.timestamp.toString()}</td>
                <td><button onClick={()=>handleTriggerOutbox(id)}>claim</button></td>

              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

export default PendingWithdrawals
