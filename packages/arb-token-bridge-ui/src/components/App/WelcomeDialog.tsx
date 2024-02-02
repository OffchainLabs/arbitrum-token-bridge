import { ExternalLink } from '../common/ExternalLink'
import { Dialog, UseDialogProps } from '../common/Dialog'

export function WelcomeDialog(props: UseDialogProps) {
  return (
    <Dialog
      {...props}
      title="Welcome"
      actionButtonTitle="Agree to Terms and Continue"
      closeable={false}
      className="w-screen md:w-[350px]"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-1 rounded bg-white/20 p-2 text-sm">
          <p className="font-medium">Safety Tip</p>
          <p>
            Arbitrum will NEVER ask you for your seed phase or private keys.
          </p>
        </div>
        <p className="text-sm">
          By clicking the below button you agree to our{' '}
          <ExternalLink
            href="https://arbitrum.io/tos"
            className="arb-hover underline"
          >
            Terms of Service.
          </ExternalLink>
        </p>
      </div>
    </Dialog>
  )
}
