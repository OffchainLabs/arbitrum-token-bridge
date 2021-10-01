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
    <div className="flex flex-col items-center text-center bg-white rounded-md">
      {showMaxButton && (
        <button
          type="button"
          onClick={setMaxAmount}
          className="border border-1 rounded-sm  px-2 text-xs mb-1 hover:bg-gray-200"
        >
          max amount
        </button>
      )}
      <input
        type="number"
        autoFocus
        className="text-xl leading-8 font-semibold mb-2 placeholder-gray3 text-gray1 focus:ring-0 focus:outline-none text-center max-w-96 w-full"
        placeholder="Enter amount here"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
    </div>
  )
}

export { AmountBox }
