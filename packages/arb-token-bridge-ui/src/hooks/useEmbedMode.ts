import { useArbQueryParams } from './useArbQueryParams'

export const useEmbedMode = () => {
  const params = useArbQueryParams()
  console.log('params', params)

  return params[0].embedMode
}
