export const CustomMessageWarning = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="mt-4 flex items-center gap-1 rounded-md border border-orange-dark bg-orange p-2 text-sm text-orange-dark lg:flex-nowrap">
      {children}
    </div>
  )
}
