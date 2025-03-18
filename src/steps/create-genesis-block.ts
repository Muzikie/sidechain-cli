import { exec } from 'child_process';
import { promisify } from 'util';

// Convert writeFile to a Promise-based function
const execAsync = promisify(exec);

export async function createGenesisBlock(config): Promise<void> {
  try {
    // Construct the command
    let command = `${config.seed.location}/bin/run genesis-block:create --output ${config.seed.location}/config/${config.seed.network} --assets-file ${config.seed.location}/config/${config.seed.network}/genesis_assets.json`;

    console.log('Generating genesis block');

    // Run the command
    const { stdout, stderr } = await execAsync(command);

    // Handle the command output
    if (stdout) {
      console.log('Genesis Block Generation output:', stdout);
    }

    if (stderr) {
      console.error('Genesis Block Generation Error Output:', stderr);
    }
  } catch (error) {
    console.error('Error Executing Genesis Block Generation Command:', error);
  }
}


