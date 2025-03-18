import {readFile, writeFile} from '../utils/io';
import {getConfigPath} from '../utils/getConfigPaths';

export async function configureRelayForEventStorage(sideChainID: string): Promise<void> {
  try {
    const configFiles = getConfigPath();
    // Read and parse the config file
    const sideChainConfig = await readFile(configFiles.sideChain);

    // Update the required fields
    sideChainConfig.rpc.modes = ['ipc', 'ws'];
    sideChainConfig.rpc.allowedMethods = ['*'];
    sideChainConfig.system.keepInclusionProofsForHeights = -1;
    sideChainConfig.genesis.chainID = sideChainID;

    // Write the updated config back to the file
    await writeFile(configFiles.sideChain, sideChainConfig);
    console.log(`Relay config updated for event storage at: ${configFiles.sideChain}`);
  } catch (error) {
    console.error('Error updating relay config for event storage, skipping this step:', error);
  }
}
