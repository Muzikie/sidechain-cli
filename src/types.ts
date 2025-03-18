export interface Config {
  sideChainName: string;
  mainChainName: string;
  mainChainID: string;
  sideChainID: string;
  password: string;
  mainChainAccount: {
    address: string;
    publicKey: string;
    privateKey: string;
  };
}
