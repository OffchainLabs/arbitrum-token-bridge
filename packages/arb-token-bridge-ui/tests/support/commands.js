import "@testing-library/cypress/add-commands";
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add("login", () => {
  cy.visit(`/`);
  cy.findByText("Agree to terms").should("be.visible").click();
  cy.findByText("MetaMask").should("be.visible");
  cy.findByText("Connect to your MetaMask Wallet")
    .click()
    .then(() => {
      cy.acceptMetamaskAccess().should("be.true");
      cy.switchToCypressWindow().should("be.true");
    });
});