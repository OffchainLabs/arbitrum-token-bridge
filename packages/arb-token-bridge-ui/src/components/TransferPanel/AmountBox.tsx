import React from 'react'

const AmountBox = ({
  amount,
  setAmount,
  setMaxAmount,
  showMaxButton
}: {
  amount: string
  setAmount: (amount: string) => void
  setMaxAmount: () => void
  showMaxButton: boolean
}): JSX.Element => {
  return (
    <div className="flex h-full flex-grow flex-row items-center justify-center px-3">
      <input
        type="number"
        autoFocus
        className="h-full w-full bg-transparent text-lg font-light placeholder:text-v3-gray-9 lg:text-3xl"
        placeholder="Enter amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      {showMaxButton && (
        <button
          type="button"
          onClick={setMaxAmount}
          className="p-2 text-sm font-light text-v3-gray-9"
        >
          MAX
        </button>
      )}
    </div>
  )
}

export { AmountBox }
