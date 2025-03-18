import { cryptography } from 'klayr-sdk';
import {readFile, writeFile} from '../utils/io';
import {getConfigPath} from '../utils/getConfigPaths';

async function getInclusionProofKeyForChain (chainID: string): Promise<string> {
  const MODULE_PREFIX = Buffer.from("83ed0d25", 'hex'); // Not chainId specific (fixed value)
  const SUBSTORE_PREFIX = Buffer.from("0000", 'hex'); // Not chainId specific (fixed value)
  const CHAIN_STORE_KEY = Buffer.from(chainID, 'hex');

  return Buffer.concat([MODULE_PREFIX, SUBSTORE_PREFIX, cryptography.utils.hash(CHAIN_STORE_KEY)]).toString('hex');
}

export async function updateInclusionProofKeys(config): Promise<void> {
  // Define file paths
  const configFiles = getConfigPath();
  try {
    const sideChainKey = await getInclusionProofKeyForChain(config.sideChainID);
    const mainChainKey = await getInclusionProofKeyForChain(config.mainChainID);

    // Log generated keys
    console.log(`NOTE! Be sure to use keys with each chain ID in the opposing chain config`);
    console.log(`1. Created using chainID: ${config.sideChainID} ---> `, sideChainKey);
    console.log(`2. Created using chainID: ${config.mainChainID} ---> `, mainChainKey);

    // Update main chain config
    const mainChainConfig = await readFile(configFiles.mainChain);
    mainChainConfig.system.inclusionProofKeys = [sideChainKey];
    await writeFile(configFiles.mainChain, mainChainConfig);

    // Update side chain config
    const sideChainConfig = await readFile(configFiles.sideChain);
    sideChainConfig.system.inclusionProofKeys = [mainChainKey];
    await writeFile(configFiles.sideChain, sideChainConfig);

    console.log('Config files updated successfully!');
  } catch (error) {
    console.error('Error updating inclusion proof keys:', error);
  }
}
