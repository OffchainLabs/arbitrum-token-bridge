export const CustomMessageWarning = ({
  show = true,
  children
}: {
  show?: boolean
  children: React.ReactNode
}) => {
  if (!show) {
    return null
  }

  return (
    <div className="flex items-center gap-1 rounded-md bg-orange p-2 text-base text-dark lg:flex-nowrap">
      {children}
    </div>
  )
}
