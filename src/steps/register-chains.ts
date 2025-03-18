import { cryptography, Modules, codec, Transaction } from 'klayr-sdk';
import { readFile } from '../utils/io';
import { Config, Clients } from '../types';

async function registerSideChainOnMainChain(config: Config, clients: Clients) {
	// Get node info data from sideChain and mainChain
	const sideChainNodeInfo = await clients.sidechain.invoke('system_getNodeInfo');
	// const mainChainNodeInfo = await mainChainClient.invoke('system_getNodeInfo');

	// Get info about the active sideChain validators and the certificate threshold
	const { validators: sideChainActiveValidators, certificateThreshold } =
		await clients.sidechain.invoke('consensus_getBFTParameters', {
			height: sideChainNodeInfo.height,
		});

	console.log('sideChainActiveValidators', (sideChainActiveValidators as unknown[]).length);
	console.log(JSON.stringify(sideChainActiveValidators));

	// Sort validator list lexicographically after their BLS key
	(sideChainActiveValidators as { blsKey: string; bftWeight: string }[]).sort((a, b) =>
		Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex')),
	);

	const unsignedTransaction = {
		module: 'interoperability',
		command: 'registerSidechain',
		fee: BigInt(2000000000),
		params: {
			sidechainCertificateThreshold: certificateThreshold,
			sidechainValidators: sideChainActiveValidators,
			chainID: sideChainNodeInfo.chainID,
			name: config.sideChain.name.replace(/-/g, '_'),
		},
	};

	console.log('unsignedTransaction', unsignedTransaction);

	const { keys } = await readFile('../out/account.json');

	const signedTransaction = await clients.mainchain.transaction.create(
		unsignedTransaction,
		keys[0].privateKey,
	);

	console.log('Sending transaction to mainChain');
	try {
		const receipt = await clients.mainchain.transaction.send(signedTransaction);
		console.log(
			`Sent sideChain '${config.sideChain.name}' registration transaction on mainChain node '${config.mainChain.name}'. Tx ID:`,
			receipt.transactionId,
		);

		// Set the registration height on the receiving node and restart it
		// await addRegistrationHeight('mainChain', Number(mainChainNodeInfo.height) + 2);
	} catch (error) {
		console.log(error);
	}
};

async function registerMainChainOnSideChain (config: Config, clients: Clients) {
	const { bls, address } = cryptography;

	// Get node info from sideChain and mainChain
	const mainChainNodeInfo = await clients.mainchain.invoke('system_getNodeInfo');
	const sideChainNodeInfo = await clients.sidechain.invoke('system_getNodeInfo');

	interface BFTParametersResponse {
		validators: { blsKey: string; bftWeight: string }[];
		certificateThreshold: number;
	}

	const {
		validators: mainChainActiveValidators,
		certificateThreshold: mainChainCertificateThreshold,
	} = await clients.mainchain.invoke('consensus_getBFTParameters', {
		height: mainChainNodeInfo.height,
	}) as BFTParametersResponse;

	console.log('mainChainActiveValidators', mainChainActiveValidators.length);
	console.log('mainChainCertificateThreshold', mainChainCertificateThreshold);

	const paramsJSON = {
		ownChainID: sideChainNodeInfo.chainID,
		ownName: config.sideChain.name.replace(/-/g, '_'),
		mainchainValidators: (mainChainActiveValidators as { blsKey: string; bftWeight: string }[])
			.map(v => ({ blsKey: v.blsKey, bftWeight: v.bftWeight }))
			.sort((a, b) => Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex'))),
		mainchainCertificateThreshold: mainChainCertificateThreshold,
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
	const { validators: sidechainActiveValidators } = await clients.sidechain.invoke(
		'consensus_getBFTParameters',
		{ height: sideChainNodeInfo.height },
	);

	console.log('sidechainActiveValidators', Array.isArray(sidechainActiveValidators) ? sidechainActiveValidators.length : sidechainActiveValidators != undefined ? Object.keys(sidechainActiveValidators).length : 'Unknown');

	// Add validator private keys to the sidechain validator list
	const activeValidatorsBLSKeys: { blsPublicKey: Buffer; blsPrivateKey: Buffer }[] = [];
	const { keys: sideChainDevValidators } = await readFile(`${config.sideChain.seedLocation}/config/${config.sideChain.network}/dev-validators.json`);

	for (const activeValidator of sidechainActiveValidators as {
		blsKey: string;
		bftWeight: string;
	}[]) {
		const sidechainDevValidator = sideChainDevValidators.find(
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
	const relayerKeyInfo = sideChainDevValidators[0];
	const { nonce } = await clients.sidechain.invoke<{ nonce: string }>('auth_getAuthAccount', {
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
		Buffer.from(sideChainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerKeyInfo.privateKey, 'hex'),
	);

	// Post the transaction to a sidechain node
	const result = await clients.sidechain.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});
	console.log('Successfully registered main chain on side chain:', result);

	// Set the registration height on the receiving node and restart it
	// await addRegistrationHeight('mainChain', Number(sideChainNodeInfo.height) + 1);
};

export async function registerChains (config: Config, clients: Clients) {
	await registerSideChainOnMainChain(config, clients);
	await registerMainChainOnSideChain(config, clients);
}