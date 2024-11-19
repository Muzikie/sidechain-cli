import { cryptography } from 'klayr-sdk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { keys } from './account.json';

async function getEncryptedPrivateKey(password: string): Promise<string> {
  try {
    const result = await cryptography.encrypt.encryptMessageWithPassword(keys[0].privateKey, password);
    const encryptedPrivateKey = await cryptography.encrypt.stringifyEncryptedMessage(result);
    console.log('Encrypted Private Key:', encryptedPrivateKey);
    return encryptedPrivateKey;
  } catch (error) {
    console.error('Error encrypting private key:', error);
    throw error;
  }
}

async function updateConfig(configPath: string, receivingChainID: string, encryptedPrivateKey: string): Promise<void> {
  try {
    // Read and parse the config file
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Ensure the `plugins.chainConnector` object exists
    if (!config.plugins) {
      config.plugins = {};
    }
    if (!config.plugins.chainConnector) {
      config.plugins.chainConnector = {};
    }

    // Update the required values
    config.plugins.chainConnector.receivingChainID = receivingChainID;
    config.plugins.chainConnector.encryptedPrivateKey = encryptedPrivateKey;

    // Write the updated config back to the file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Updated chainConnector config at: ${configPath}`);
  } catch (error) {
    console.error(`Error updating config file at ${configPath}:`, error);
    throw error;
  }
}


export async function updateEncryptedPrivateKey(
  mainChainID: string,
  sideChainID: string,
  password: string
): Promise<void> {
  try {
    const mainConfigPath = path.join(os.homedir(), '.klayr', 'klayr-core', 'config', 'config.json');
    const sideConfigPath = path.resolve('../../relay/config/default/config.json');

    // Calculate the encrypted private key
    const encryptedPrivateKey = await getEncryptedPrivateKey(password);

    // Update main chain config
    await updateConfig(mainConfigPath, sideChainID, encryptedPrivateKey);

    // Update side chain config
    await updateConfig(sideConfigPath, mainChainID, encryptedPrivateKey);

    console.log('Chain connector configs updated successfully!');
  } catch (error) {
    console.error('Error updating chain connector configs:', error);
  }
}
