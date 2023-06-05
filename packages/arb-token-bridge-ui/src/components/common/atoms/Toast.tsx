import { ToastContainer, toast } from 'react-toastify'

import { ExternalLink } from '../ExternalLink'
import { GET_HELP_LINK } from '../../../constants'

export const networkConnectionWarningToast = () =>
  warningToast(
    <>
      Network connection issue. Please contact{' '}
      <ExternalLink href={GET_HELP_LINK} className="underline">
        support
      </ExternalLink>
      .
    </>
  )

export const errorToast = (message: React.ReactNode) => {
  toast.error(message)
}

export const warningToast = (message: React.ReactNode) => {
  toast.warning(message)
}

export const Toast = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      pauseOnHover
      theme="light"
    />
  )
}
