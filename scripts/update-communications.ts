import { promises as fs } from 'fs';
import path from 'path';

export async function configureRelayForEventStorage(): Promise<void> {
  try {
    // Define the path to the side chain relay config
    const sideConfigPath = path.resolve('../../relay/config/default/config.json');

    // Read and parse the config file
    const configContent = await fs.readFile(sideConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    // Ensure the `rpc` and `system` objects exist
    if (!config.rpc) {
      config.rpc = {};
    }
    if (!config.system) {
      config.system = {};
    }

    // Update the required fields
    config.rpc.modes = ['ipc', 'ws'];
    config.rpc.allowedMethods = ['*'];
    config.system.keepInclusionProofsForHeights = -1;

    // Write the updated config back to the file
    await fs.writeFile(sideConfigPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Relay config updated for event storage at: ${sideConfigPath}`);
  } catch (error) {
    console.error('Error updating relay config for event storage, skipping this step:', error);
  }
}
