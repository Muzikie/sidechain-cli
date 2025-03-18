import { apiClient, Transaction, codec } from 'klayr-sdk';
import { readFile } from '../utils/io';
import { wait } from '../utils/wait';
import { TransferCrossChainProps, TransferProps } from '../types'

const crossChainTransferParamsSchema = {
  $id: '/klayr/ccTransferParams',
  type: 'object',
  required: [
      'tokenID',
      'amount',
      'receivingChainID',
      'recipientAddress',
      'data',
      'messageFee',
      'messageFeeTokenID',
  ],
  properties: {
      tokenID: {
          dataType: 'bytes',
          fieldNumber: 1,
          minLength: 16,
          maxLength: 16,
      },
      amount: {
          dataType: 'uint64',
          fieldNumber: 2,
      },
      receivingChainID: {
          dataType: 'bytes',
          fieldNumber: 3,
          minLength: 8,
          maxLength: 8,
      },
      recipientAddress: {
          dataType: 'bytes',
          fieldNumber: 4,
          format: 'klayr32',
      },
      data: {
          dataType: 'string',
          fieldNumber: 5,
          minLength: 0,
          maxLength: 64,
      },
      messageFee: {
          dataType: 'uint64',
          fieldNumber: 6,
      },
      messageFeeTokenID: {
          dataType: 'bytes',
          fieldNumber: 7,
          minLength: 16,
          maxLength: 16,
      },
  },
};

export async function transfer({
  client,
  senderAccount,
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

  const signedTransaction = await client.transaction.create(txParams, senderAccount.privateKey);

  try {
    const receipt = await client.transaction.send(signedTransaction);
    console.log(`Tokens sent to ${recipientAddress}, ID`, receipt.transactionId);
  } catch (error) {
    console.log(`Failed to send`, error);
  }

  await wait(10000);

  const info = await client.invoke('token_getBalances', {"address": recipientAddress});
  console.log('Account balance: ', info);
}

export async function transferCrossChain({
  client,
  senderAccount,
  recipientAddress,
  amount,
  sendingChainID, 
  receivingChainID, 
  mainChainID,
}: TransferCrossChainProps) {
  const { keys } = await readFile('../out/account.json');
  const txParams = {
    module: "token",
    command: "transfer",
    fee: BigInt("7000000"),
    params: {
      amount: BigInt(amount || "10000000000"),
      recipientAddress,
      tokenID: `${sendingChainID}00000000`,
      data: 'Fill registration tank',
      receivingChainID,
      messageFee: BigInt("110000"),
      messageFeeTokenID: `${mainChainID}00000000`
    }
  };

  let nonce = 0;
  const sender = senderAccount || keys[0];

  const result = await client.invoke('auth_getAuthAccount', {address: sender.address});
  if (Object.keys(result).includes('nonce')) {
    nonce = Number(result.nonce);
  }
  const tx = new Transaction({
		module: 'token',
		command: 'transferCrossChain',
		fee: BigInt('7000000'),
		params: codec.encodeJSON(crossChainTransferParamsSchema, txParams.params),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(sender.publicKey, 'hex'),
		signatures: [],
	});
  
  tx.sign(
		Buffer.from(sendingChainID, 'hex'),
		Buffer.from(sender.privateKey, 'hex'),
	);
  const receipt = await client.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

  console.log(`Sent CCT from ${sender.address}.: ID`, receipt.transactionId);
}

export async function transferTokensToRelayer (
  sideChainID: string,
  mainChainID: string,
  mainChainAccount: {
    address: string;
    privateKey: string;
    publicKey: string;
  },
  sidechainClient: apiClient.APIClient,
  mainchainClient: apiClient.APIClient,
) {
  const { keys: validators }  = await readFile('../../seed/config/default/dev-validators.json');
  const { keys } = await readFile('../out/account.json');
  try {
    console.log('Sending side chain tokens to the relayer account');
    await transfer({
      client: sidechainClient,
      senderAccount: validators[0],
      recipientAddress: keys[0].address,
      amount: '5000000000',
      sendingChainID: sideChainID, 
    });
  } catch (error) {
    console.log(`Failed to send on sidechain`, error);
  }

  try {
    console.log('Sending main chain tokens to the relayer account');
    await transfer({
      client: mainchainClient,
      senderAccount: mainChainAccount,
      recipientAddress: keys[0].address,
      amount: '5000000000',
      sendingChainID: mainChainID, 
    });
  } catch (error) {
    console.log(`Failed to send on mainchain`, error);
  }
}

export async function checkTransferCrossChain(
  sideChainID: string,
  mainChainID: string,
  mainchainClient: apiClient.APIClient,
) {
  const { keys } = await readFile('../out/account.json');
  console.log('Transferring tokens across chains');
  const senderAccount = keys[0];
  try {
    console.log('Sending tokens to the side chain');
    await transferCrossChain({
      client: mainchainClient,
      senderAccount: senderAccount,
      recipientAddress: 'klyy3wzwkeu779d9cr2wvjs8muoorcvqup7fr6ozc',
      amount: '200000000',
      sendingChainID: mainChainID, 
      receivingChainID: sideChainID, 
      mainChainID,
    });
  } catch (error) {
    console.log(`Failed to send tokens to side chain`, error);
  }
}