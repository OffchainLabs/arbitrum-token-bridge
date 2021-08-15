import React from 'react'

const NetworkSwitchButton = () => {
  return (
    <button
      type="button"
      className="text-gray-600 bg-gray6 rounded-full w-9 h-9 min-h-9 min-w-9 shadow-networkButton flex items-center justify-center"
    >
      <svg
        width="9"
        height="11"
        viewBox="0 0 9 11"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.09723 6.52778L4.50001 10.125M4.50001 10.125L0.902784 6.52778M4.50001 10.125L4.50001 0.875"
          stroke="#111827"
          strokeWidth="1.02778"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export { NetworkSwitchButton }
