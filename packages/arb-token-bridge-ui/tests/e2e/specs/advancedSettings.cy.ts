import { importTokenThroughUI } from '../../support/common'

describe('Use advanced settings', () => {
  beforeEach(() => {
    cy.login({ networkType: 'L1', networkName: 'goerli' })
    // TODO: remove the token import after enabling advanced settings for ETH
    importTokenThroughUI('0x1f9840a85d5af5bf1d1762f925bdaddc4201f984')
    cy.findByText('UNI').click()
    cy.waitUntil(
      () =>
        cy
          .findByRole('button', { name: /Advanced Settings/i })
          .should('be.visible'),
      {
        errorMsg: "Can't find /Advanced Settings/i",
        timeout: 10000,
        interval: 500
      }
    )
  })

  it('should hide/show the advanced settings UI', () => {
    const advancedSettingsButton = cy.findByRole('button', {
      name: /Advanced Settings/i
    })
    advancedSettingsButton.should('be.visible')
    // starts collapsed
    cy.findByText(/Custom Destination Address/i).should('not.exist')
    // click and show
    advancedSettingsButton.click()
    cy.findByText(/Custom Destination Address/i).should('be.visible')
    // click and hide
    advancedSettingsButton.click()
    cy.findByText(/Custom Destination Address/i).should('not.exist')
  })

  it('should insert destination address and validate', () => {
    cy.getMetamaskWalletAddress().then((address: string) => {
      cy.findByRole('button', {
        name: /Advanced Settings/i
      })
        .should('be.visible')
        .click()

      const input = cy.findByPlaceholderText(address)

      // input is locked by default
      input.should('be.visible').and('be.disabled')
      cy.findByPlaceholderText(address)
        .parent()
        .within(() => {
          cy.findByRole('button').should('be.visible').click()
        })

      // input is now unlocked
      input.should('be.enabled')

      // insert an invalid address
      input.typeRecursively('0x0')
      cy.findByText(/The destination address is not a valid address/i).should(
        'be.visible'
      )

      // try a contract wallet address
      input.typeRecursively(
        '0xEFFB47A4CFE2449a45E82Eb827eD176357735021'.toLowerCase()
      )
      cy.findByText(/The destination address is a contract address/i).should(
        'be.visible'
      )

      // try EOA wallet address
      input.typeRecursively(
        '0x1798440327D78EBb19Db0C8999e2368eaEd8F413'.toLowerCase()
      )
      // no error
      cy.findByPlaceholderText(address)
        .parent()
        .should('have.class', 'border-gray-dark')
      cy.findByText(/View account in explorer/i).should('be.visible')

      // can't close advanced settings when input is populated
      cy.findByRole('button', {
        name: /Advanced Settings/i
      }).should('be.disabled')

      // clear the input, advanced settings are now collapsible
      input.clear()
      cy.findByRole('button', {
        name: /Advanced Settings/i
      }).should('be.enabled')
    })
  })
})
