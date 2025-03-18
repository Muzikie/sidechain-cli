import { Config } from '../types';
import { readFile } from '../utils/io';
import { wait } from '../utils/wait';

export const selfVote = async (config: Config, sidechainClient) => {
  const { keys } = await readFile(`${config.sideChain.seedLocation}/config/${config.sideChain.network}/dev-validators.json`);
  for await (const validator of keys) {
    const { privateKey, address } = validator;
    console.log('Trying', address);
    const txParams = {
      module: "pos",
      command: "stake",
      fee: BigInt("10000000"),
      params: {
        stakes: [
          {
            validatorAddress: address,
            amount: BigInt('200000000000') // Self-stake 1000 tokens
          }
        ]
      }
    };

    const signedTransaction = await sidechainClient.transaction.create(txParams, privateKey);

    console.log(`Self staking on sidechain for ${address}`);
    try {
      const receipt = await sidechainClient.transaction.send(signedTransaction);
      console.log(`Stake Success for ${address}. Tx ID:`, receipt.transactionId);
    } catch (error) {
      console.log(`Stake Failure for ${address}.`, error);
    }
  }
};

const voteOthers = async (config: Config, sidechainClient) => {
  let batchSize = 0;
  const { keys } = await readFile(`${config.sideChain.seedLocation}/config/${config.sideChain.network}/dev-validators.json`);
  for await (const validator of keys) {
    const { privateKey, address: stakerAddress } = validator;
    let nonce = 0;
  
    const result = await sidechainClient.invoke('auth_getAuthAccount', {address: stakerAddress});
    if (Object.keys(result).includes('nonce')) {
      nonce = Number(result.nonce);
    }
    console.log('Initial nonce of the account is ', nonce);

    for await (const { address: validatorAddress } of keys) {
      if (stakerAddress !== validatorAddress) { // Skip self-staking in this loop
        const txParams = {
          module: "pos",
          command: "stake",
          fee: BigInt("10000000"),
          nonce: BigInt(nonce),
          params: {
            stakes: [
              {
                validatorAddress,
                amount: BigInt('100000000000') // Stake 100 tokens for other validators
              }
            ]
          }
        };

        const signedTransaction = await sidechainClient.transaction.create(txParams, privateKey);

        console.log(`Staking 100 tokens from ${stakerAddress} to ${validatorAddress}`);
        try {
          const receipt = await sidechainClient.transaction.send(signedTransaction);
          console.log(`Cross-stake Success from ${stakerAddress} to ${validatorAddress}, ${!!receipt.transactionId}`);
          console.log(`Nonce: ${nonce}, Batch number ${batchSize}`);
          batchSize++;
          nonce++;

          if (batchSize >= 20) {
            console.log('Batch result triggered');
            batchSize = 0;
            await wait(10000);
          }

        } catch (error) {
          console.log(`Cross-stake Failure from ${stakerAddress} to ${validatorAddress}.`, error);
        }
      }
    }
  }
}

const checkBalances = async (config: Config, sidechainClient) => {
  const { keys } = await readFile(`${config.sideChain.seedLocation}/config/${config.sideChain.network}/dev-validators.json`);
  for await (const validator of keys) {
    const sidechainNodeInfo = await sidechainClient.invoke('token_getBalances', { address: validator.address });
    console.log('sidechainNodeInfo', Array.isArray(sidechainNodeInfo?.balances) ? sidechainNodeInfo.balances : 'no locked');
  }
}


export async function stakeTokensForValidators (config: Config, sidechainClient) {
  // Self-stake loop
  await selfVote(config, sidechainClient);

  await wait(10000);

  // Cross-stake loop
  await voteOthers(config, sidechainClient);

  await wait(10000);

  await checkBalances(config, sidechainClient);
}
