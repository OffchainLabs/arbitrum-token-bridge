import { ToastContainer, toast } from 'react-toastify'

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
