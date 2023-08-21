export const CustomMessageWarning = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="flex items-center gap-1 rounded-md bg-orange p-2 text-base text-dark lg:flex-nowrap">
      {children}
    </div>
  )
}
