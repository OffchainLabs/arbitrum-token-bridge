#!/usr/bin/env node
const specFiles = require("../../packages/arb-token-bridge-ui/tests/e2e/specfiles.json");
const cctpFiles = require("../../packages/arb-token-bridge-ui/tests/e2e/cctp.json");

const tests = [];

const testType = process.argv[2];
switch (testType) {
  case "regular": {
    specFiles.forEach((spec) => {
      tests.push({
        ...spec,
        type: "regular",
        typeName: "",
        testnodeArgs: "",
      });
      tests.push({
        ...spec,
        type: "orbit-eth",
        typeName: "with L3 (ETH)",
        testnodeArgs: "--l3node --l3-token-bridge",
      });
      tests.push({
        ...spec,
        type: "orbit-custom-16dec",
        typeName: "with L3 (16 decimals custom)",
        testnodeArgs: "--l3node --l3-token-bridge --l3-fee-token --l3-fee-token-decimals 16",
      });
      tests.push({
        ...spec,
        type: "orbit-custom-18dec",
        typeName: "with L3 (18 decimals custom)",
        testnodeArgs: "--l3node --l3-token-bridge --l3-fee-token",
      });
      tests.push({
        ...spec,
        type: "orbit-custom-20dec",
        typeName: "with L3 (20 decimals custom)",
        testnodeArgs: "--l3node --l3-token-bridge --l3-fee-token --l3-fee-token-decimals 20",
      });
    });
    break;
  }
  case "cctp": {
    // Running CCTP tests in parallel cause nonce issues, we're running the two tests sequentially
    tests.push({
      name: "cctp",
      typeName: "",
      testnodeArgs: "",
      file: "tests/e2e/specs/**/*Cctp.cy.{js,jsx,ts,tsx}",
      recordVideo: false,
      type: "cctp",
    });
    break;
  }
}

console.log(JSON.stringify(tests));
