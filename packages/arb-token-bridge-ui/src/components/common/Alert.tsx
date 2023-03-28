import React from 'react'

import {
  CheckCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
  XCircleIcon,
  CreditCardIcon
} from '@heroicons/react/solid'

const Alert = ({
  children,
  type
}: {
  children: React.ReactNode
  type: 'red' | 'blue' | 'green' | 'yellow' | 'ramps'
}) => {
  return (
    <div
      className={`rounded-md bg-red-50 p-4 ${
        type === 'red'
          ? 'bg-red-50'
          : type === 'blue'
          ? 'bg-blue-50'
          : type === 'yellow'
          ? 'bg-yellow-50'
          : 'bg-green-50'
      }`}
    >
      <div className="flex">
        <div className="shrink-0">
          {type === 'red' && (
            <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          )}
          {type === 'blue' && (
            <InformationCircleIcon
              className="h-5 w-5 text-blue-400"
              aria-hidden="true"
            />
          )}
          {type === 'yellow' && (
            <ExclamationIcon
              className="h-5 w-5 text-yellow-400"
              aria-hidden="true"
            />
          )}
          {type === 'green' && (
            <CheckCircleIcon
              className="h-5 w-5 text-green-400"
              aria-hidden="true"
            />
          )}
          {type === 'ramps' && (
            <CreditCardIcon
              className="h-5 w-5 text-green-400"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="ml-3">
          <h3
            className={`text-sm ${
              type === 'red'
                ? 'text-red-800'
                : type === 'blue'
                ? 'text-blue-800'
                : type === 'yellow'
                ? 'text-yellow-800'
                : 'text-green-700'
            }`}
          >
            {children}
          </h3>
        </div>
      </div>
    </div>
  )
}

export { Alert }
