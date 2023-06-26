export function ExternalLink({
  children,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onClick = () => {},
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  function onClickHandler(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    onClick(event)
  }

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClickHandler}
      {...props}
    >
      {children}
    </a>
  )
}
