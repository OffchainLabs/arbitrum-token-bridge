import Image from 'next/image'

import { PORTAL_API_ENDPOINT } from '../../constants'
import { ExternalLink } from './ExternalLink'

export type PortalProject = {
  chains: string[]
  description: string
  id: string
  images: { logoUrl: string; bannerUrl: string }
  subcategories: { id: string; title: string }[]
  title: string
  url: string
}

export const Project = ({
  project,
  onClick,
  isTestnetMode
}: {
  project: PortalProject
  onClick?: () => void
  isTestnetMode: boolean
}) => {
  return (
    <ExternalLink
      className="relative flex h-full min-h-[150px] w-full flex-col gap-2 overflow-hidden rounded-md border border-white/30 bg-dark p-4 hover:bg-dark-hover hover:opacity-100"
      aria-label={`${project.title}`}
      href={
        isTestnetMode
          ? PORTAL_API_ENDPOINT
          : `${PORTAL_API_ENDPOINT}?project=${project.id}`
      }
      onClick={onClick}
    >
      {/* Normal project contents */}
      <div className="flex w-full flex-row gap-1">
        {/* Logos */}
        <div className="flex shrink-0 grow-0 flex-col gap-2 overflow-hidden bg-cover bg-center">
          {/* Project logo */}
          <div className="relative flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-white p-[1px]">
            <div className="[&:hover_span]:opacity-100">
              <Image
                alt={`${project.title} logo`}
                src={project.images.logoUrl}
                width={50}
                height={50}
                className="rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative grow text-left">
          <div className="flex flex-col gap-1 px-2">
            <h5 className="relative flex items-center gap-2 text-left text-lg font-semibold leading-7">
              {project.title}
            </h5>
            <p className="mb-2 line-clamp-3 text-sm opacity-70">
              {project.description}
            </p>

            <p className="flex flex-wrap justify-start gap-2 text-center leading-6 text-gray-700">
              {project.subcategories.slice(0, 2).map(subcategory => (
                <span
                  key={subcategory.id}
                  className="inline-flex items-start justify-start gap-2 break-words rounded bg-black px-1.5 py-0.5 text-xs font-normal text-white/60"
                >
                  {subcategory.title.replaceAll('/', ' / ')}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </ExternalLink>
  )
}
