import path from 'path';
import os from 'os';

export function getConfigPath () {
  const mainChain = path.join(os.homedir(), '.klayr', 'klayr-core', 'config', 'config.json');
  const sideChain = path.resolve('../../relay/config/default/config.json'); // Dynamically import and throw proper error if not available

  return {mainChain, sideChain};
}
