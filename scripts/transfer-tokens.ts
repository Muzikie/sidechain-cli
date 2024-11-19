import { apiClient } from 'klayr-sdk';
// import { keys } from '../../seed/config/default/dev-validators.json';
import { keys } from '../output/account.json';

const wait = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TransferProps {
  client: apiClient.APIClient;
  privateKey: string;
  recipientAddress: string;
  amount: string;
  sendingChainID: string;
}
type TransferCrossChainProps = TransferProps & {
  receivingChainID: string;
  mainChainID: string;
}
export async function transfer({
  client,
  privateKey,
  recipientAddress,
  amount,
  sendingChainID, 
}: TransferProps) {
  const txParams = {
    module: "token",
    command: "transfer",
    fee: BigInt("7000000"),
    params: {
      amount: BigInt(amount || "10000000000"),
      recipientAddress,
      tokenID: `${sendingChainID}00000000`,
      data: "",
    }
  };

  const signedTransaction = await client.transaction.create(txParams, privateKey);

  try {
    const receipt = await client.transaction.send(signedTransaction);
    console.log(`Sent from ${keys[1].address}.: ID`, receipt.transactionId);
  } catch (error) {
    console.log(`Failed to send`, error);
  }

  await wait(10000);

  const info = await client.invoke('token_getBalances', {"address": recipientAddress});
  console.log('Account balance: ', info);
}

export async function transferCrossChain({
  client,
  privateKey,
  recipientAddress,
  amount,
  sendingChainID, 
  receivingChainID, 
  mainChainID,
}: TransferCrossChainProps) {
  const txParams = {
    module: "token",
    command: "transfer",
    fee: BigInt("7000000"),
    params: {
      amount: BigInt(amount || "10000000000"),
      recipientAddress,
      tokenID: `${sendingChainID}00000000`,
      data: "",
      receivingChainID,
      messageFee: BigInt("110000"),
      messageFeeTokenID: `${mainChainID}00000000`
    }
  };

  const signedTransaction = await client.transaction.create(txParams, privateKey);
  const receipt = await client.transaction.send(signedTransaction);
  console.log(`Sent from ${keys[1].address}.: ID`, receipt.transactionId);

  await wait(10000);

  const info = await client.invoke('token_getBalances', {"address": recipientAddress});
  console.log('Account balance: ', info);
}

export async function transferTokensToRelayer (sidechainClient, mainchainClient, sideChainID: string, mainChainID: string, mainChainPrivateKey) {
  try {
    await transfer({
      client: sidechainClient,
      privateKey: keys[0].privateKey,
      recipientAddress: keys[0].address,
      amount: '10000000000',
      sendingChainID: sideChainID, 
    });
  } catch (error) {
    console.log(`Failed to send on sidechain`, error);
  }

  try {
    await transfer({
      client: mainchainClient,
      privateKey: mainChainPrivateKey,
      recipientAddress: keys[0].address,
      amount: '10000000000',
      sendingChainID: mainChainID, 
    });
  } catch (error) {
    console.log(`Failed to send on mainchain`, error);
  }
}