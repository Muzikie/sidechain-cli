import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function deleteExistingAppData(sideChainName: string): Promise<void> {
  try {
    // Define the paths to delete
    const sideChainPath = path.join(os.homedir(), '.klayr', sideChainName);
    const relayPath = path.join(os.homedir(), '.klayr', 'relay');

    // Delete the directories recursively
    await fs.rm(sideChainPath, { recursive: true, force: true });
    console.log(`Deleted directory: ${sideChainPath}`);

    await fs.rm(relayPath, { recursive: true, force: true });
    console.log(`Deleted directory: ${relayPath}`);
  } catch (error) {
    console.error('Error deleting directories:', error);
    throw error;
  }
}
