describe("Login Account", () => {
  before(() => {
    cy.disconnectMetamaskWalletFromAllDapps();
  });

  it("Should show connect wallet if not logged in", () => {
    cy.visit(`/`);
    cy.findByText("Agree to terms").should("be.visible").click();
    cy.findByText("MetaMask").should("be.visible");
    cy.findByText("Connect to your MetaMask Wallet").should("be.visible");
  });

  it("Should connect wallet using MetaMask successfully", () => {
    cy.login();
    cy.findByText("Bridging summary will appear here.").should("be.visible");
  });
});