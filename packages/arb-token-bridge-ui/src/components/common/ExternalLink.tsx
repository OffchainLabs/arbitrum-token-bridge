export function ExternalLink({
  children,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onClick = () => {},
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a target="_blank" rel="noopener noreferrer" onClick={onClick} {...props}>
      {children}
    </a>
  )
}
