import { cryptography } from 'klayr-sdk';
import {readFile, writeFile} from '../utils/io';
import {getConfigPath} from '../utils/getConfigPaths';

async function verifyEncryption(encryptedPrivateKey: cryptography.encrypt.EncryptedMessageObject, password: string, originalPrivateKey: string): Promise<boolean> {
  try {
    const decryptedMessage = await cryptography.encrypt.decryptMessageWithPassword(encryptedPrivateKey, password);
    return decryptedMessage.compare(Buffer.from(originalPrivateKey)) === 0;
  } catch (error) {
    console.error('Error decrypting private key:', error);
    return false;
  }
}

async function getEncryptedPrivateKey(password: string): Promise<{
  encryptedPrivateKey: string;
  isValid: boolean;
}> {
  const { keys } = await readFile('../out/account.json')
  try {
    const result = await cryptography.encrypt.encryptMessageWithPassword(keys[0].privateKey, password);
    const isValid = await verifyEncryption(result, password, keys[0].privateKey);
    const encryptedPrivateKey = await cryptography.encrypt.stringifyEncryptedMessage(result);
    return {
      encryptedPrivateKey, isValid,
    };
  } catch (error) {
    console.error('Error encrypting private key:', error);
    throw error;
  }
}

export async function updateEncryptedPrivateKey(
  mainChainID: string,
  sideChainID: string,
  password: string
): Promise<void> {
  try {
    const configFiles = getConfigPath();

    // Calculate the encrypted private key
    const {encryptedPrivateKey, isValid} = await getEncryptedPrivateKey(password);

    if (isValid) {
      // Update main chain config
      const mainChainConfig = await readFile(configFiles.mainChain);
      if (!mainChainConfig.plugins.chainConnector) {
        mainChainConfig.plugins.chainConnector = {};
      }
      mainChainConfig.plugins.chainConnector.receivingChainID = sideChainID;
      mainChainConfig.plugins.chainConnector.encryptedPrivateKey = encryptedPrivateKey;

      await writeFile(configFiles.mainChain, mainChainConfig);
      console.log('Main chain connector configs updated successfully!');
  
      // Update side chain config
      const sideChainConfig = await readFile(configFiles.sideChain);
      if (!sideChainConfig.plugins.chainConnector) {
        sideChainConfig.plugins.chainConnector = {};
      }
      sideChainConfig.plugins.chainConnector.receivingChainID = mainChainID;
      sideChainConfig.plugins.chainConnector.encryptedPrivateKey = encryptedPrivateKey;

      await writeFile(configFiles.sideChain, sideChainConfig);
      console.log('Side chain connector configs updated successfully!');
    } else {
      console.log('Could not validate encrypted private key, skipping this step.');
    }
  } catch (error) {
    console.error('Error updating chain connector configs:', error);
  }
}
