import { useActions, useAppState } from '../../state'

export function NetworkSwitchButton() {
  const {
    app: { isDepositMode }
  } = useAppState()
  const actions = useActions()

  return (
    <button
      onClick={() => actions.app.setIsDepositMode(!isDepositMode)}
      type="button"
      className="min-h-14 lg:min-h-16 min-w-14 lg:min-w-16 flex h-14 w-14 items-center justify-center rounded-full bg-white p-3 shadow-[0px_0px_4px_rgba(0,0,0,0.25)] transition duration-200 hover:bg-gray-2 active:mt-1 active:bg-gray-2 lg:h-16 lg:w-16"
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.5368 7.87034C12.2528 7.15438 13.4136 7.15438 14.1295 7.87034L21.4629 15.2037C22.1788 15.9196 22.1788 17.0804 21.4629 17.7964C20.7469 18.5124 19.5861 18.5124 18.8701 17.7964L14.6665 13.5928V34.8334C14.6665 35.8459 13.8457 36.6667 12.8332 36.6667C11.8206 36.6667 10.9998 35.8459 10.9998 34.8334V13.5928L6.7962 17.7964C6.08024 18.5124 4.91944 18.5124 4.20347 17.7964C3.48751 17.0804 3.48751 15.9196 4.20347 15.2037L11.5368 7.87034ZM29.3332 30.4073V9.16671C29.3332 8.15419 30.154 7.33337 31.1665 7.33337C32.179 7.33337 32.9998 8.15419 32.9998 9.16671V30.4073L37.2035 26.2037C37.9194 25.4877 39.0802 25.4877 39.7962 26.2037C40.5122 26.9196 40.5122 28.0804 39.7962 28.7964L32.4629 36.1297C32.1191 36.4735 31.6527 36.6667 31.1665 36.6667C30.6803 36.6667 30.214 36.4735 29.8701 36.1297L22.5368 28.7964C21.8208 28.0804 21.8208 26.9196 22.5368 26.2037C23.2528 25.4877 24.4136 25.4877 25.1295 26.2037C25.8455 26.9196 29.3332 30.4073 29.3332 30.4073Z"
          fill="#999999"
        />
      </svg>
    </button>
  )
}
