/*    
    Helpful when you want to nudge users towards a new UI feature using a tooltip or persistent banner.
    Sets a flag in local-storage for the `feature-key`. 
    If the user checks out the new feature in UI, then our business logic can clear this update this flag to mark the feature as viewed once.
*/

import { useLocalStorage } from 'react-use'

export const useNewFeatureIndicator = (featureKey: string) => {
  return useLocalStorage<boolean>(`arbitrum:new:${featureKey}`) //eg. arbitrum:new:tx-history
}
