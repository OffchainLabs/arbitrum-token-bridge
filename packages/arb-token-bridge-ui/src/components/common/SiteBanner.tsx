export const SiteBanner = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className="bg-atmosphere-blue px-4 py-[8px] text-center text-sm font-normal text-white"
      {...props}
    >
      {children}
    </div>
  )
}
