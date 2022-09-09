describe("Login Account", () => {
  before(() => {
    console.log("wt")
    // cy.disconnectMetamaskWalletFromAllDapps();
  });
  
  it("Should show connect wallet if not logged in", () => {
    // console.log("testing")
    cy.visit(`http://127.0.0.1:3000/`);
    // cy.findByRole("button", { name: /connect wallet/i }).should("be.visible");
  });

  // it("Should trigger login modal and ask for metamask login", () => {
  //   cy.visit("/");
  //   cy.findByRole("button", { name: /connect wallet/i }).click();
  //   cy.acceptMetamaskAccess().should("be.true");
  //   cy.switchToAccount(1);
  //   cy.switchToCypressWindow().should("be.true");
  //   cy.findByText(/please sign in using metamask account:/i).should("be.visible");
  //   cy.confirmMetamaskSignatureRequest();
  // });
});