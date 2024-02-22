import {
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export function SecurityGuaranteed() {
  return (
    <div className="flex">
      <div className="flex h-fit items-center space-x-1 rounded bg-lime-dark p-2 text-xs text-lime">
        <CheckCircleIcon height={16} />
        <span>Security guaranteed by Ethereum</span>
      </div>
    </div>
  )
}

export function SecurityNotGuaranteed() {
  return (
    <div className="flex">
      <div className="flex h-fit items-center space-x-1 rounded bg-orange-dark p-2 text-xs text-orange">
        <ExclamationTriangleIcon height={16} />
        <span>Security not guaranteed by Arbitrum</span>
      </div>
    </div>
  )
}
