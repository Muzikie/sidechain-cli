import { storeAccountKey } from './steps/create-relayer-account';
import { updateInclusionProofKeys } from './steps/update-inclusion-proof-keys';
import { createGenesisBlock } from './steps/create-genesis-block';
import { updateEncryptedPrivateKey } from './steps/update-encrypted-private-key';
import { configureRelayForEventStorage } from './steps/update-communications';
import { copyGenesisBlob } from './steps/copy-genesis';
import { deleteExistingAppData } from './steps/delete-existing-app-data';
import { startNodes } from './steps/run-nodes';
import { registerChains } from './steps/register-chains';
import { stakeTokensForValidators } from './steps/stake-tokens-for-validators';
import { connectToChains } from './clientManager/connect-to-chains';
import { transferTokensToRelayer, checkTransferCrossChain } from './steps/transfer-tokens';
import { authorizeChainConnectorPlugins } from './steps/chain-connector-plugins';
import fs from 'fs';
import { Config } from './types';

const steps = {
  createGenesisBlock:
    async (config, _clients) => await createGenesisBlock(config),
  storeAccountKey:
    async (_config, _clients) => await storeAccountKey(),
  updateInclusionProofKeys:
    async (config: Config, _clients) => await updateInclusionProofKeys(config),
  updateEncryptedPrivateKey:
    async (config: Config, _clients) => await updateEncryptedPrivateKey(config.mainChainID, config.sideChainID, config.password),
  configureRelayForEventStorage:
    async (config: Config, _clients) => await configureRelayForEventStorage(config.sideChainID),
  copyGenesisBlob:
    async (config, _clients) => await copyGenesisBlob(config),
  deleteExistingAppData:
    async (config: Config, _clients) => await deleteExistingAppData(config.sideChainName),
  startNodes:
    async (_config, _clients) => await startNodes(),
  connectToChains: async (config: Config) => {
    const { mainchainClient, sidechainClient } = await connectToChains(config.sideChainName, config.mainChainName);
    await authorizeChainConnectorPlugins(sidechainClient, mainchainClient, config.password);
    return { mainchainClient, sidechainClient };
  },
  transferTokensToRelayer:
    async (config: Config, clients: any) => await transferTokensToRelayer(config.sideChainID, config.mainChainID, config.mainChainAccount, clients.sidechainClient, clients.mainchainClient),
  registerChains:
    async (config: Config, clients: any) => await registerChains(config.sideChainName, config.mainChainName, clients.sidechainClient, clients.mainchainClient),
  checkTransferCrossChain:
    async (config: Config, clients: any) => await checkTransferCrossChain(config.sideChainID, config.mainChainID, clients.mainchainClient),
  stakeTokensForValidators:
    async (_config, clients: any) => await stakeTokensForValidators(clients.sidechainClient),
};

(async () => {
  const args = process.argv.slice(2); // Command-line arguments for step names or JSON file
  let selectedSteps: string[] = [];
  let config: Config | null = null;
  let clients = {};

  if (args.length === 1 && args[0].endsWith('.json')) {
    // Load configuration and steps from JSON file
    const jsonFile = args[0];
    try {
      const fileContent = fs.readFileSync(jsonFile, 'utf-8');
      const parsedContent = JSON.parse(fileContent);

      if (!parsedContent.config || !Array.isArray(parsedContent.steps)) {
        throw new Error('Invalid JSON format. Expected an object with "config" and "steps" properties.');
      }

      config = parsedContent.config;
      selectedSteps = parsedContent.steps;
    } catch (error) {
      console.error(`Error reading or parsing JSON file`);
      process.exit(1);
    }
  } else {
    console.error('Please provide a valid JSON file with configuration and steps.');
    process.exit(1);
  }

  if (!config) {
    process.exit(0);
  }

  for (const step of selectedSteps) {
    if (steps[step]) {
      console.log(`Running step: ${step}`);
      if (step === 'connectToChains') {
        clients = await steps[step](config);
      } else {
        await steps[step](config, clients);
      }
    } else {
      console.error(`Unknown step: ${step}`);
    }
  }

  process.exit(0);
})();
