import React, { useMemo } from 'react'
import { TxnType } from 'token-bridge-sdk'
import { useL1Network, useL2Network } from 'components/App/NetworkContext'

interface props {
  hash: string
  type: TxnType | 'address' | 'chain'
  layer?: 1 | 2
}

const ExplorerLink = ({ hash, type, layer }: props) => {
  const l1Prefix = useL1Network().explorerUrl
  const l2Prefix = useL2Network().explorerUrl

  const url = useMemo(() => {
    switch (type) {
      case 'deposit':
      case 'deposit-l1':
      case 'approve':
      case 'connext-deposit':
      case 'outbox':
        return `${l1Prefix}/tx/${hash}`
      case 'deposit-l2':
      case 'withdraw':
      case 'connext-withdraw':
      case 'deposit-l2-auto-redeem':
        return `${l2Prefix}/tx/${hash}`

      case 'chain':
        return `${l2Prefix}/chain/${hash}`
      case 'address':
        if (layer === 1) {
          return `${l1Prefix}/address/${hash}`
        } else {
          return `${l2Prefix}/address/${hash}`
        }
    }
  }, [hash, type, layer])

  return (
    <a href={url} target="_blank">
      {hash}
    </a>
  )
}

export default ExplorerLink
