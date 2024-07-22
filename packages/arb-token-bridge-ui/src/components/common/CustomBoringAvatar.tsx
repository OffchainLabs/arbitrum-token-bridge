import BoringAvatar from 'boring-avatars'

export function CustomBoringAvatar({
  size,
  name
}: {
  size: number
  name?: string
}) {
  return (
    <BoringAvatar
      size={size}
      name={name?.toLowerCase()}
      variant="beam"
      colors={['#11365E', '#EDD75A', '#73B06F', '#0C8F8F', '#405059']}
    />
  )
}
