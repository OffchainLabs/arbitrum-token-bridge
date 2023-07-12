export const TransactionsTableCustomAddressBanner = ({
  senderAddress
}: {
  senderAddress: string
}) => {
  return (
    <tr className="bg-gray-200 p-1 text-sm">
      Funds received from: {senderAddress}
    </tr>
  )
}
