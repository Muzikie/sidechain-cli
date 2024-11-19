import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runCommandInTab(command: string, tabName: string): Promise<void> {
  try {
    console.log(`Running: ${command} in terminal tab: ${tabName}`);
    await execAsync(
      `osascript -e 'tell application "Terminal" to do script "${command}" in front window'`
    );
  } catch (error) {
    console.error(`Error running command in tab "${tabName}":`, error);
    throw error;
  }
}

export async function startNodesAndActivateChainConnector(password: string): Promise<void> {
  try {
    // Step 1: Run mainchain relay node
    await runCommandInTab(
      `klayr-core start --network testnet --enable-chain-connector-plugin`,
      'Mainchain Relay'
    );

    // Step 2: Run side chain seed node
    await runCommandInTab(`seed start`, 'Side Chain Seed');

    // Step 3: Run side chain relay node
    await runCommandInTab(`relay start`, 'Side Chain Relay');

    // Step 4: Wait for nodes to run for 10 seconds
    console.log('Waiting for 10 seconds to ensure nodes are running...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Step 5: Activate the chain connector plugin for both relay nodes
    // Activate for mainchain relay
    const mainChainCommand = `klayr-core endpoint:invoke chainConnector_authorize '{"enable": true, "password": "${password}"}'`;
    await runCommandInTab(mainChainCommand, 'Activate Mainchain Relay');

    // Activate for sidechain relay
    const sideChainCommand = `relay endpoint:invoke chainConnector_authorize '{"enable": true, "password": "${password}"}'`;
    await runCommandInTab(sideChainCommand, 'Activate Sidechain Relay');

    console.log('Chain connector plugin activated successfully!');
  } catch (error) {
    console.error('Error during node startup or activation:', error);
  }
}
