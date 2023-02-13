import Image from 'next/image'

export const NoDataOverlay = () => {
  return (
    <div className="relative flex h-full min-h-[500px] w-full flex-col items-center p-[2rem]">
      <div className="text-center text-white">
        <p className="whitespace-nowrap text-lg">
          Oops! Looks like nothing matched your search query.
        </p>
        <p className="whitespace-nowrap text-base">
          You can search for full or partial tx ID&apos;s.
        </p>
      </div>

      <Image
        src={'/images/ArbinautMoonWalking.webp'}
        alt="Moon walking Arbibaut"
        className="relative"
        layout="fill"
        objectFit="contain"
      />
    </div>
  )
}
