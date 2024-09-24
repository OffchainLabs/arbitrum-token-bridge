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
      });
      tests.push({
        ...spec,
        type: "orbit",
      });
    });
    break;
  }
  case "cctp": {
    tests.push({
      name: "cctp",
      file: "tests/e2e/specs/**/*Cctp.cy.{js,jsx,ts,tsx}",
      recordVideo: false,
      type: "cctp",
    });
    break;
  }
}

console.log(JSON.stringify(tests));
