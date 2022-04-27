import { useMemo } from 'react'
import { TxnType } from 'token-bridge-sdk'

import { Tooltip } from './Tooltip'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

interface ExplorerLinkProps {
  hash?: string
  type: TxnType | 'address' | 'chain'
  layer?: 1 | 2
}

const ExplorerLink = ({ hash, type, layer }: ExplorerLinkProps) => {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  const l1Prefix = l1Network?.explorerUrl
  const l2Prefix = l2Network?.explorerUrl

  const url = useMemo(() => {
    if (typeof l1Prefix === 'undefined' || typeof l2Prefix === 'undefined') {
      return '#'
    }

    switch (type) {
      case 'deposit':
      case 'deposit-l1':
      case 'approve':
      case 'outbox':
        return `${l1Prefix}/tx/${hash}`
      case 'deposit-l2':
      case 'withdraw':
      case 'deposit-l2-auto-redeem':
      case 'deposit-l2-ticket-created':
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
  }, [hash, type, layer, l1Prefix, l2Prefix])

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
        {hash.substring(0, 10)}...{hash.substring(hash.length - 4)}
        <Tooltip>{hash}</Tooltip>
      </span>
    </a>
  )
}

export default ExplorerLink
