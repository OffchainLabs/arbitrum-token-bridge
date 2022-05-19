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
    <div className="px-3 flex-grow flex flex-row items-center justify-center h-full">
      <input
        type="number"
        autoFocus
        className="h-full w-full text-lg lg:text-3xl placeholder:text-v3-gray-9 font-light bg-transparent"
        placeholder="Enter amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      {showMaxButton && (
        <button
          type="button"
          onClick={setMaxAmount}
          className="text-sm p-2 text-v3-gray-9 font-light"
        >
          MAX
        </button>
      )}
    </div>
  )
}

export { AmountBox }
