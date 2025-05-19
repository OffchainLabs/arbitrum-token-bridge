import { TokenSearch } from './TokenSearch'
import { Dialog, UseDialogProps } from '../common/Dialog'

export const TokenSelectionDialog = (props: UseDialogProps) => {
  return (
    <Dialog
      {...props}
      onClose={() => props.onClose(false)}
      title=""
      actionButtonProps={{ hidden: true }}
      isFooterHidden={true}
      className="relative h-screen overflow-hidden"
    >
      <TokenSearch close={() => props.onClose(false)} />
    </Dialog>
  )
}
