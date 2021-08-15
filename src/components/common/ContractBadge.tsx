import React from 'react'

import { LabelRenderer } from './LabelRenderer'
import { Tooltip } from './Tooltip'

const ContractBadge: React.FC<{ tx: any }> = ({ tx }) => {
  return (
    <div className="relative group">
      <span className="flex items-center px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full bg-gray-100 text-gray-900">
        <span
          className={`mr-2 w-2 h-2 rounded-full ${
            tx.reverted ? 'bg-red-400' : 'bg-green-400'
          }`}
        />
        <span>
          Contract creation
          {tx.contractAddress && (
            <span className="block text-sm leading-5 truncate text-bright-blue w-36">
              <LabelRenderer address={tx.contractAddress} />
              <Tooltip>{tx.contractAddress}</Tooltip>
            </span>
          )}
        </span>
      </span>
    </div>
  )
}

export { ContractBadge }
