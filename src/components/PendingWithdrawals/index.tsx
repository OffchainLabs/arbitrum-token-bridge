import { utils } from 'ethers'
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { PendingWithdrawalsMap, L2ToL1EventResultPlus } from 'token-bridge-sdk'
import Table from 'react-bootstrap/Table'

interface PendingWithdrawalsProps {
  pendingWithdrawalsMap: PendingWithdrawalsMap
  filter: (data: L2ToL1EventResultPlus) => boolean
  headerText: string
  triggerOutbox: (id: string) => {} | undefined
  getLatestArbBlock: any
  // Header
}
const { formatEther } = utils

const PendingWithdrawals = ({
  pendingWithdrawalsMap,
  filter,
  headerText,
  triggerOutbox,
  getLatestArbBlock
}: PendingWithdrawalsProps) => {


  const [currentTime, setCurrentTime] = useState(0)
  useEffect(()=>{
    window.setInterval(()=>{
      getLatestArbBlock().then((block:any)=>{
        console.warn(block);
        setCurrentTime(block.timestamp)
        
      })
    }, 5000)
  },[])

  const handleTriggerOutbox = useCallback (async  (id: string, timestamp: string | number)=>{
    if (timestamp !== 0){
      return alert("Can't claim this withdrawal yet; try again later")
    }
    const res = await triggerOutbox(id)
    if (!res){
      alert("Can't claim this withdrawal yet; try again later")
    }
  }, [currentTime])

  const calcTimeRemaining = useCallback ((timestamp:number)=>{
    if (currentTime === 0){
      return "..."
    }
    const ellapsedTime = Math.floor((currentTime - timestamp) / 60)
    const totalTimeMinutes = 24*60;
    return Math.max(0, totalTimeMinutes - ellapsedTime)
  }, [currentTime])
  //  sort, include id in data, and filter out target PWs // sort by ts
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
            <th>est. time remaining (minutes)</th>
            <th></th>

          </tr>
        </thead>
        <tbody>
          {pendingWithdrawalsToShow.map(pw => {
            const id = pw.uniqueId.toString()
            const timeRemaining = calcTimeRemaining(+pw.timestamp)
            return (
              <tr key={id}>
                <td>{formatEther(pw.value.toString())}</td>
                <td>{ timeRemaining }</td>
                <td><button onClick={()=>handleTriggerOutbox(id, timeRemaining)}>claim</button></td>

              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}

export default PendingWithdrawals
