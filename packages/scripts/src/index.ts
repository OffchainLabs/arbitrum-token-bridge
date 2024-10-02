#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import { addOrbitChain } from "./addOrbitChain";
import { validateOrbitChainsList } from "./addOrbitChain/schemas";

const program = new Command();

program
  .name("orbit-scripts")
  .description("CLI for Orbit chain management scripts")
  .version("1.0.0");

program
  .command("add-orbit-chain <targetJsonPath>")
  .description("Add a new Orbit chain")
  .action((targetJsonPath) => {
    addOrbitChain(targetJsonPath).catch((error) => {
      console.error(`Error in addOrbitChain: ${error}`);
      process.exit(1);
    });
  });

program
  .command("validate-orbit-chains-data")
  .description("Validate the orbitChainsData.json file")
  .argument("<file>", "Path to the orbitChainsData.json file")
  .action((file: string) => {
    try {
      const data = fs.readFileSync(file, "utf8");
      const orbitChainsList = JSON.parse(data);
      validateOrbitChainsList(orbitChainsList).catch((error) => {
        console.error(`Error in validateOrbitChainsList: ${error}`);
        process.exit(1);
      });
    } catch (error) {
      console.error("Error reading or parsing file:", error);
      process.exit(1);
    }
  });

// Add more commands here as needed, for example:
// program
//   .command('some-other-script')
//   .description('Description of the other script')
//   .action(() => {
//     // Call the function for the other script
//   });

program.parse(process.argv);
