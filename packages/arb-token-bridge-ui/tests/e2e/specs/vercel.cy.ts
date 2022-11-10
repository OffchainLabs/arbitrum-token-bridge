/**
 * Only here to make sure that React Router routes work when deployed to Vercel. https://github.com/vercel/vercel/issues/7475
 *
 * TODO: Remove after we migrate from Vercel to our own infra.
 */
describe('Vercel', () => {
  it('should have a working route to /tos', () => {
    // eslint-disable-next-line
    cy.visit(
      'https://arb-token-bridge-git-fix-vercel-config-offchain-labs.vercel.app/tos'
    )
    cy.findByText(/acceptance of these terms of service/i).should('be.visible')
  })
})
