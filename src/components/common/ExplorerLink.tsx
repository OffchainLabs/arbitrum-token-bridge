import React, { useMemo } from 'react'

import { useAppState } from 'src/state'
import { TxnType } from 'token-bridge-sdk'

import { Tooltip } from './Tooltip'

interface ExplorerLinkProps {
  hash?: string
  type: TxnType | 'address' | 'chain'
  layer?: 1 | 2
}

const ExplorerLink = ({ hash, type, layer }: ExplorerLinkProps) => {
  const {
    app: { l1NetworkDetails, l2NetworkDetails }
  } = useAppState()
  const l1Prefix = l1NetworkDetails?.explorerUrl
  const l2Prefix = l2NetworkDetails?.explorerUrl

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
        }
        return `${l2Prefix}/address/${hash}`
      default:
        return '#'
    }
  }, [hash, type, layer])

  if (!hash) {
    return null
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-24 relative group"
    >
      <span className="truncate">
        {hash.substr(0, 15)}...{hash.substr(hash.length - 4)}
        <Tooltip>{hash}</Tooltip>
      </span>
    </a>
  )
}

export default ExplorerLink
