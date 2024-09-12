#!/usr/bin/env node
const specFiles = require("../../packages/arb-token-bridge-ui/tests/e2e/specfiles.json");
const cctpFiles = require("../../packages/arb-token-bridge-ui/tests/e2e/cctp.json");

// For each test in specFiles, add an orbit test
const tests = [];
specFiles.forEach((spec) => {
  tests.push({
    ...spec,
    type: "regular",
    orbitTest: "0",
  });
  tests.push({
    ...spec,
    type: "regular",
    orbitTest: "1",
  });
});

const includeCctp = Boolean(process.argv[2] === "includeCctp" || false);
if (includeCctp) {
  cctpFiles.forEach((spec) => {
    tests.push({
      ...spec,
      type: "cctp",
      orbitTest: null,
    });
  });
}

console.log(JSON.stringify(tests));
