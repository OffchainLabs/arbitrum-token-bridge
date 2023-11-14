export default function RestrictedPage() {
  return (
    <div className="flex w-full flex-col items-center space-y-4 px-8 py-4 text-center lg:py-20">
      <span className="mb-5 text-4xl leading-tight text-white lg:text-5xl">
        Cannot connect from your location
      </span>
      <p className="text-2xl leading-relaxed tracking-wide text-white">
        We apologize, this page is not available in certain jurisdictions due to
        legal restrictions.
      </p>
    </div>
  )
}
