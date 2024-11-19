import {storeAccountKey} from './create-relayer-account';
import {updateInclusionProofKeys} from './update-inclusion-proof-keys';
import {updateEncryptedPrivateKey} from './update-encrypted-private-key';
import {configureRelayForEventStorage} from './update-communications';
import {copyGenesisBlob} from './copy-genesis';
import {deleteExistingAppData} from './delete-existing-app-data';
import {startNodesAndActivateChainConnector} from './run-nodes';
import {registerChains} from './register-chains';
import {stakeTokensForValidators} from './stake-tokens-for-validators';
import { connectToChains } from './connect-to-chains';
import { transferTokensToRelayer } from './transfer-tokens';

(async () => {
  const sideChainName = 'keeley';
  const mainChainName = 'klayr-core';
  const mainChainID = '01000000';
  const sideChainID = '01000048';
  const password = 'Sina1373ksh';
  const mainChainPrivateKey = '671ed2ebf5f5200629d4888804b9f5666b20ae1eea8320da5f82a2598229c0128616aa8a5050ae3c2d3a07f44e4c6ca4d43dd085d737abb68c39023fa7685699';

  // Store account keys
  await storeAccountKey('./account.json');

  // Update inclusion proof keys
  await updateInclusionProofKeys(mainChainID, sideChainID);

  // Update chain connector 
  await updateEncryptedPrivateKey(mainChainID, sideChainID, password);
  
  // Update communication configs
  await configureRelayForEventStorage();

  // Copy and paste the genesis file to the relay config
  await copyGenesisBlob();

  // Delete relay and seed data if existed
  await deleteExistingAppData(sideChainName);

  // Run nodes and active the connector plugin
  await startNodesAndActivateChainConnector(password);

  // Connect to chains
  const {mainchainClient, sidechainClient} = await connectToChains(sideChainName, mainChainName);

  // Send tokens to the relayer account on both chains
  transferTokensToRelayer(sidechainClient, mainchainClient, sideChainID, mainChainID, mainChainPrivateKey);

  // Register side and main chains
  await registerChains(sideChainName, mainChainName, sidechainClient, mainchainClient);

  // Stake tokens for side chain dev validators
  await stakeTokensForValidators(sidechainClient);
  process.exit(0);
})();

