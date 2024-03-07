import { ToastContainer, toast } from 'react-toastify'

export const errorToast = (
  message: React.ReactNode,
  {
    autoClose
  }: {
    autoClose?: number | false | undefined
  } = { autoClose: 5000 }
) => {
  toast.error(message, { autoClose })
}

export const warningToast = (
  message: React.ReactNode,
  {
    autoClose
  }: {
    autoClose?: number | false | undefined
  } = { autoClose: 5000 }
) => {
  toast.warning(message, { autoClose })
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
      theme="dark"
    />
  )
}
