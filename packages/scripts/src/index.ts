#!/usr/bin/env node
import { Command } from 'commander'
import { addOrbitChain } from './addOrbitChain'

const program = new Command()

program
  .name('orbit-scripts')
  .description('CLI for Orbit chain management scripts')
  .version('1.0.0')

program
  .command('add-orbit-chain <targetJsonPath>')
  .description('Add a new Orbit chain')
  .action(targetJsonPath => {
    addOrbitChain(targetJsonPath).catch(error => {
      console.error(`Error in addOrbitChain: ${error}`)
      process.exit(1)
    })
  })

// Add more commands here as needed, for example:
// program
//   .command('some-other-script')
//   .description('Description of the other script')
//   .action(() => {
//     // Call the function for the other script
//   });

program.parse(process.argv)
