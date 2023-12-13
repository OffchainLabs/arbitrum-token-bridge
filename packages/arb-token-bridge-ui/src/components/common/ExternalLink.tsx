export function ExternalLink({
  children,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) {
    return children
  }
  return (
    <a target="_blank" href={href} rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}
