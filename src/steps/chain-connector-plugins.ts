import {apiClient} from 'klayr-sdk';
import {readFile, writeFile} from '../utils/io';
import {getConfigPath} from '../utils/getConfigPaths';

export async function authorizeChainConnectorPlugins (sidechainClient: apiClient.APIClient, mainchainClient: apiClient.APIClient, password: string) {
  try {
    const result = await mainchainClient.invoke(
      'chainConnector_authorize',
      {enable: true, password},
    );
    console.log('Mainchain:', result);
  } catch (e) {
    console.log('Error invoking endpoint chainConnector_authorize on main chain', e);
  }

  try {
    const result = await sidechainClient.invoke(
      'chainConnector_authorize',
      {enable: true, password},
    );
    console.log('Sidechain:', result);
  } catch (e) {
    console.log('Error invoking endpoint chainConnector_authorize on side chain', e);
  }
}

export async function addRegistrationHeight (chainName: 'sideChain' | 'mainChain', registrationHeight: number) {
  try {
    const configFiles = getConfigPath();
    const config = await readFile(configFiles[chainName]);
    config.plugins.chainConnector.registrationHeight = registrationHeight;
    await writeFile(configFiles[chainName], config);
    console.log(`Successfully added registrationHeight ${registrationHeight} to ${chainName} config`);
  } catch (error) {
    console.error('Error add registration height:', error);
  }
}
