import { passphrase } from 'klayr-sdk';
import { exec } from 'child_process';
import { writeFile } from 'fs';
import { promisify } from 'util';
import path from 'path';

// Convert writeFile to a Promise-based function
const writeFileAsync = promisify(writeFile);
const execAsync = promisify(exec);

export async function createPassphrase(passphrasePath?: string) {
  const relaterAccountPassphrase = passphrase.Mnemonic.generateMnemonic();
  console.log({relaterAccountPassphrase})
  const filePath = path.join('..', passphrasePath || './out/passphrase.json');
  try {
    await writeFileAsync(filePath, JSON.stringify({relaterAccountPassphrase}), 'utf8');
    console.log(`Passphrase file saved at ${filePath}`);
    return relaterAccountPassphrase;
  } catch (error) {
    console.error(`Failed to save passphrase:`, error);
    return '';
  }
}

export async function storeAccountKey(accountPath?: string, passphrasePath?: string): Promise<void> {
  try {
    const pass = await createPassphrase(passphrasePath);
    // Construct the command
    const filePath = path.join('..', accountPath || './out/account.json');
    let command = `klayr-core keys:create --no-encrypt --passphrase "${pass}" --output ${filePath}`;

    console.log(`Executing: ${command}`);

    // Run the command
    const { stdout, stderr } = await execAsync(command);

    // Handle the command output
    if (stdout) {
      console.log('Command Output:', stdout);
    }

    if (stderr) {
      console.error('Command Error Output:', stderr);
    }
  } catch (error) {
    console.error('Error executing command:', error);
  }
}


