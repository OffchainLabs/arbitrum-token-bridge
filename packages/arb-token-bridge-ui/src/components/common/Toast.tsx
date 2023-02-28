import { ToastContainer, toast } from 'react-toastify'

export const userRejectedToast = () => {
  toast.error('User rejected transaction')
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
