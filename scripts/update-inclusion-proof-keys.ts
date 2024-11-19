import { cryptography } from 'klayr-sdk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function updateInclusionProofKeys(mainChainID: string, sideChainID: string): Promise<void> {
  try {
    // Define file paths
    const mainConfigPath = path.join(os.homedir(), '.klayr', 'klayr-core', 'config', 'config.json');
    const sideConfigPath = path.resolve('../../relay/config/default/config.json');

    // Generate prefixes and store keys
    const MODULE_PREFIX = Buffer.from('83ed0d25', 'hex');
    const SUBSTORE_PREFIX = Buffer.from('0000', 'hex');
    const MAIN_STORE_KEY = Buffer.from(mainChainID, 'hex');
    const SIDE_STORE_KEY = Buffer.from(sideChainID, 'hex');

    // Generate inclusion proof keys
    const mainChainInclusionProofKeys = Buffer.concat([
      MODULE_PREFIX,
      SUBSTORE_PREFIX,
      cryptography.utils.hash(MAIN_STORE_KEY),
    ]);
    const sideChainInclusionProofKeys = Buffer.concat([
      MODULE_PREFIX,
      SUBSTORE_PREFIX,
      cryptography.utils.hash(SIDE_STORE_KEY),
    ]);

    const mainChainInclusionProofKeysStr = mainChainInclusionProofKeys.toString('hex');
    const sideChainInclusionProofKeysStr = sideChainInclusionProofKeys.toString('hex');

    // Log generated keys
    console.log(`NOTE! Be sure to use keys with each chain ID in the opposing chain config`);
    console.log(`1. Created using chainID: ${mainChainID} ---> `, mainChainInclusionProofKeysStr);
    console.log(`2. Created using chainID: ${sideChainID} ---> `, sideChainInclusionProofKeysStr);

    // Update mainnet config
    await updateConfig(mainConfigPath, sideChainInclusionProofKeysStr);

    // Update sidechain config
    await updateConfig(sideConfigPath, mainChainInclusionProofKeysStr);

    console.log('Config files updated successfully!');
  } catch (error) {
    console.error('Error updating inclusion proof keys:', error);
  }
}

async function updateConfig(configPath: string, inclusionProofKey: string): Promise<void> {
  try {
    // Read and parse the config file
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Ensure the `system` object and `inclusionProofKeys` array exist
    if (!config.system) {
      config.system = {};
    }
    config.system.inclusionProofKeys = [inclusionProofKey];

    // Write the updated config back to the file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Updated config file at: ${configPath}`);
  } catch (error) {
    console.error(`Error updating config file at ${configPath}:`, error);
    throw error;
  }
}
