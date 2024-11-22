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
      });
      tests.push({
        ...spec,
        type: "orbit-eth",
        typeName: "with L3 (ETH)",
      });
      tests.push({
        ...spec,
        type: "orbit-custom-6dec",
        typeName: "with L3 (6 decimals custom)",
      });
      tests.push({
        ...spec,
        type: "orbit-custom-18dec",
        typeName: "with L3 (18 decimals custom)",
      });
      tests.push({
        ...spec,
        type: "orbit-custom-20dec",
        typeName: "with L3 (20 decimals custom)",
      });
    });
    break;
  }
  case "cctp": {
    // Running CCTP tests in parallel cause nonce issues, we're running the two tests sequentially
    tests.push({
      name: "cctp",
      typeName: "",
      file: "tests/e2e/specs/**/*Cctp.cy.{js,jsx,ts,tsx}",
      recordVideo: false,
      type: "cctp",
    });
    break;
  }
}

console.log(JSON.stringify(tests));
