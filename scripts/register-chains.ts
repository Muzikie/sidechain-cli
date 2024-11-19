import { apiClient, cryptography, Modules, codec, Transaction, Types } from 'klayr-sdk';
// Replace this with the path to a file storing the public and private key of a mainchain account who will send the sidechain registration transaction.
// (Can be any account with enough tokens).
import { keys } from '../out/account.json';
import {keys as sidechainDevValidators} from '../../seed/config/default/dev-validators.json';

async function registerSideChainOnMainChain(sideChainName:string, mainChainName: string, sidechainClient: apiClient.APIClient, mainchainClient: apiClient.APIClient) {
	// Get node info data from sidechain and mainchain
	const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	// Get info about the active sidechain validators and the certificate threshold
	const { validators: sidechainActiveValidators, certificateThreshold } =
		await sidechainClient.invoke('consensus_getBFTParameters', {
			height: sidechainNodeInfo.height,
		});

	console.log('sidechainActiveValidators', (sidechainActiveValidators as unknown[]).length);
	console.log(JSON.stringify(sidechainActiveValidators));

	// Sort validator list lexicographically after their BLS key
	(sidechainActiveValidators as { blsKey: string; bftWeight: string }[]).sort((a, b) =>
		Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex')),
	);

	const unsignedTransaction = {
		module: 'interoperability',
		command: 'registerSidechain',
		fee: BigInt(2000000000),
		params: {
			sidechainCertificateThreshold: certificateThreshold,
			sidechainValidators: sidechainActiveValidators,
			chainID: sidechainNodeInfo.chainID,
			name: sideChainName.replace(/-/g, '_'),
		},
	};

	const signedTransaction = await mainchainClient.transaction.create(
		unsignedTransaction,
		keys[0].privateKey,
	);

	console.log('Sending transaction to mainchain');
	try {
		const receipt = await mainchainClient.transaction.send(signedTransaction);
		console.log(
			`Sent sidechain '${sideChainName}' registration transaction on mainchain node '${mainChainName}'. Tx ID:`,
			receipt.transactionId,
		);
	} catch (error) {
		console.log(error);
	}
};

async function registerMainChainOnSideChain (sideChainName:string, mainChainName: string, sidechainClient: apiClient.APIClient, mainchainClient: apiClient.APIClient) {
	const { bls, address } = cryptography;

	// Get node info from sidechain and mainchain
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');
	const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	interface BFTParametersResponse {
		validators: { blsKey: string; bftWeight: string }[];
		certificateThreshold: number;
	}

	const {
		validators: mainchainActiveValidators,
		certificateThreshold: mainchainCertificateThreshold,
	} = await mainchainClient.invoke('consensus_getBFTParameters', {
		height: mainchainNodeInfo.height,
	}) as BFTParametersResponse;

	console.log('mainchainActiveValidators', mainchainActiveValidators.length);
	console.log('mainchainCertificateThreshold', mainchainCertificateThreshold);

	const paramsJSON = {
		ownChainID: sidechainNodeInfo.chainID,
		ownName: sideChainName.replace(/-/g, '_'),
		mainchainValidators: (mainchainActiveValidators as { blsKey: string; bftWeight: string }[])
			.map(v => ({ blsKey: v.blsKey, bftWeight: v.bftWeight }))
			.sort((a, b) => Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex'))),
		mainchainCertificateThreshold,
	};
	console.log('paramsJSON', paramsJSON);

	// Define parameters for the mainchain registration
	const params = {
		ownChainID: Buffer.from(paramsJSON.ownChainID as string, 'hex'),
		ownName: paramsJSON.ownName,
		mainchainValidators: paramsJSON.mainchainValidators.map(v => ({
			blsKey: Buffer.from(v.blsKey, 'hex'),
			bftWeight: BigInt(v.bftWeight),
		})),
		mainchainCertificateThreshold: BigInt(paramsJSON.mainchainCertificateThreshold), // Ensure BigInt
	};
	console.log('Bufferized the params');

	// Encode parameters
	const message = codec.encode(Modules.Interoperability.registrationSignatureMessageSchema, params);

	// Get active validators from sidechain
	const { validators: sidechainActiveValidators } = await sidechainClient.invoke(
		'consensus_getBFTParameters',
		{ height: sidechainNodeInfo.height },
	);
    
	console.log('sidechainActiveValidators', Array.isArray(sidechainActiveValidators) ? sidechainActiveValidators.length : sidechainActiveValidators != undefined ? Object.keys(sidechainActiveValidators).length : 'Unknown');

	// Add validator private keys to the sidechain validator list
	const activeValidatorsBLSKeys: { blsPublicKey: Buffer; blsPrivateKey: Buffer }[] = [];

	for (const activeValidator of sidechainActiveValidators as {
		blsKey: string;
		bftWeight: string;
	}[]) {
		const sidechainDevValidator = sidechainDevValidators.find(
			devValidator => devValidator.plain.blsKey === activeValidator.blsKey,
		);
		if (sidechainDevValidator) {
			activeValidatorsBLSKeys.push({
				blsPublicKey: Buffer.from(activeValidator.blsKey, 'hex'),
				blsPrivateKey: Buffer.from(sidechainDevValidator.plain.blsPrivateKey, 'hex'),
			});
		} else {
			console.log('Failed to sign with', activeValidator);
		}
	}
	console.log('Total activeValidatorsBLSKeys:', activeValidatorsBLSKeys.length);

	// Sort active validators from sidechain lexicographically after their BLS public key
	activeValidatorsBLSKeys.sort((a, b) => a.blsPublicKey.compare(b.blsPublicKey));
	const sidechainValidatorsSignatures: { publicKey: Buffer; signature: Buffer }[] = [];

	// Sign parameters with each active sidechain validator
	for (const validator of activeValidatorsBLSKeys) {
		const signature = bls.signData(
			Modules.Interoperability.MESSAGE_TAG_CHAIN_REG,
			params.ownChainID,
			message,
			validator.blsPrivateKey,
		);
		sidechainValidatorsSignatures.push({ publicKey: validator.blsPublicKey, signature });
	}

	const publicBLSKeys = activeValidatorsBLSKeys.map(v => v.blsPublicKey);
	console.log('Total active sidechain validators:', sidechainValidatorsSignatures.length);

	// Create an aggregated signature
	const { aggregationBits, signature } = bls.createAggSig(
		publicBLSKeys,
		sidechainValidatorsSignatures,
	);

	// Get public key and nonce of the sender account
	const relayerKeyInfo = sidechainDevValidators[0];
	const { nonce } = await sidechainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getKlayr32AddressFromPublicKey(Buffer.from(relayerKeyInfo.publicKey, 'hex')),
	});

	// Add aggregated signature to the parameters of the mainchain registration
	const mainchainRegParams = {
		...paramsJSON,
		signature: signature.toString('hex'),
		aggregationBits: aggregationBits.toString('hex'),
	};

	// Create registerMainchain transaction
	const tx = new Transaction({
		module: 'interoperability',
		command: 'registerMainchain',
		fee: BigInt(2000000000),
		params: codec.encodeJSON(Modules.Interoperability.mainchainRegParams, mainchainRegParams),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerKeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	// Sign the transaction
	tx.sign(
		Buffer.from(sidechainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerKeyInfo.privateKey, 'hex'),
	);

	// Post the transaction to a sidechain node
	const result = await sidechainClient.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

};

export async function registerChains (sideChainName:string, mainChainName: string, sidechainClient: apiClient.APIClient, mainchainClient: apiClient.APIClient) {
	await registerMainChainOnSideChain(sideChainName, mainChainName, mainchainClient, sidechainClient);
	await registerSideChainOnMainChain(sideChainName, mainChainName, mainchainClient, sidechainClient);
}