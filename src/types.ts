import { apiClient } from 'klayr-sdk';

export interface Config {
  sideChain: {
    seedLocation: string;
    relayLocation: string;
    network: string;
    name: string;
    chainId: string;
  };
  mainChain: {
    name: string;
    chainId: string;
  };
  password: string;
  mainChainAccount: {
    address: string;
    publicKey: string;
    privateKey: string;
  };
}

export interface Clients {
  sidechain: apiClient.APIClient;
  mainchain: apiClient.APIClient;
}

export interface TransferProps {
  client: apiClient.APIClient;
  senderAccount: {
    address: string;
    privateKey: string;
    publicKey: string;
  };
  recipientAddress: string;
  amount: string;
  sendingChainID: string;
}
export type TransferCrossChainProps = TransferProps & {
  receivingChainID: string;
  mainChainID: string;
}
