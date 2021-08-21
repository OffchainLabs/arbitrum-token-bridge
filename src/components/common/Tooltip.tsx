import React from 'react'

const Tooltip = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <div className="absolute bottom-0 flex flex-col items-center mb-8 group-hover:flex bg-black hidden z-50 ">
      <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-black shadow-lg ">
        {children}
      </span>
      <div className="w-3 h-3 -mt-2 rotate-45 bg-black " />
    </div>
  )
}

export { Tooltip }
