import { promises as fs } from 'fs';
import path from 'path';

export async function copyGenesisBlob(): Promise<void> {
  try {
    // Define the source and destination paths
    const sourcePath = path.resolve('../../seed/config/default/genesis_block.blob');
    const destinationPath = path.resolve('../config/default/genesis_block.blob');

    // Ensure the destination directory exists
    const destinationDir = path.dirname(destinationPath);
    await fs.mkdir(destinationDir, { recursive: true });

    // Copy the file
    await fs.copyFile(sourcePath, destinationPath);
    console.log(`Genesis blob file copied from ${sourcePath} to ${destinationPath}`);
  } catch (error) {
    console.error('Error copying genesis blob file:', error);
    throw error;
  }
}
