export const SiteBanner = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className="bg-gradient px-4 py-2 text-center text-sm text-white lg:text-base"
      {...props}
    >
      {children}
    </div>
  )
}
