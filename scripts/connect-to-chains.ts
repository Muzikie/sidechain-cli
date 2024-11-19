import { apiClient } from 'klayr-sdk';

export async function connectToChains (sideChainName:string, mainChainName: string) {
	try {
		console.log("Connecting to mainchain...");
		const mainchainClient = await apiClient.createIPCClient(`~/.klayr/${mainChainName}`);
		console.log("Connected to mainchain");
	
		console.log("Connecting to sidechain...");
		const sidechainClient = await apiClient.createIPCClient(`~/.klayr/${sideChainName}`);
		console.log("Connected to sidechain");
	
		return {
			mainchainClient,
			sidechainClient
		};
	} catch (e) {
		console.log('Error connecting to the chains', e);
		throw new Error('Error connecting to the chains');
	}
}