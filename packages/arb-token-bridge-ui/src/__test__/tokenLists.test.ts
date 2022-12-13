import { BRIDGE_TOKEN_LISTS, fetchTokenListFromURL } from '../tokenLists'

/**
 * TODO: Move this test (or a similar one) to the token lists repo
 */
describe('Token Lists', () => {
  it('validates that all token lists have the proper schema', async () => {
    const results = await Promise.all(
      BRIDGE_TOKEN_LISTS.map(bridgeTokenList =>
        fetchTokenListFromURL(bridgeTokenList.url)
      )
    )

    expect(
      // Filter only invalid results
      results.filter(result => !result.isValid)
    ).toHaveLength(0)
  })
})
