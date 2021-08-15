import React from 'react'

const StatusBadge = (): JSX.Element => {
  return (
    <span className="flex items-center px-3 py-2 inline-flex text-sm leading-5 font-medium rounded-xl bg-blue-100 text-blue-800">
      <span className="mr-2 w-2 h-2 bg-blue-400 rounded-full" />2 Processing
    </span>
  )
}

export { StatusBadge }
