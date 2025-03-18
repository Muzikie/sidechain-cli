import { apiClient } from 'klayr-sdk';


async function connectToSideChain (sideChainName: string) {
	try {
		console.log("Connecting to sidechain relay...", sideChainName);
		return await apiClient.createIPCClient(`~/.klayr/relay`);
	} catch (e) {
		console.log('Error connecting to the sidechain', e);
		return null as unknown as apiClient.APIClient;
	}
}

async function connectToMainChain (mainChainName: string) {
	try {
		console.log("Connecting to mainchain...");
		return await apiClient.createIPCClient(`~/.klayr/${mainChainName}`);
	} catch (e) {
		console.log('Error connecting to the mainchain', e);
		return null as unknown as apiClient.APIClient;
	}
}

export async function connectToChains (sideChainName:string, mainChainName: string) {
	let connections = {
		mainchainClient: null as unknown as apiClient.APIClient,
		sidechainClient: null as unknown as apiClient.APIClient,
	};

	const sidechainClient = await connectToSideChain(sideChainName);
	if (sidechainClient) {
		connections.sidechainClient = sidechainClient;
		console.log("Connected to side chain");
	}

	const mainchainClient = await connectToMainChain(mainChainName);
	if (mainchainClient) {
		connections.mainchainClient = mainchainClient;
		console.log("Connected to main chain");
	}

	return connections;
}