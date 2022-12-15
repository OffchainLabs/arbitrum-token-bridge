import { BRIDGE_TOKEN_LISTS, fetchTokenListFromURL } from './../useTokenLists'

/**
 * TODO: Move this test (or a similar one) to the token lists repo
 */
describe('Token Lists', () => {
  jest.setTimeout(20_000)

  it('validates that all token lists have the proper schema', async () => {
    const remoteTokenListUrls = BRIDGE_TOKEN_LISTS
      //
      .map(tokenList => tokenList.url)
      .filter(url => !url.startsWith('/'))

    const results = await Promise.all(
      remoteTokenListUrls.map(url => fetchTokenListFromURL(url))
    )

    expect(
      // Filter only invalid results
      results.filter(result => !result.isValid)
    ).toHaveLength(0)
  })
})
