import { promises as fs } from 'fs';

export async function readFile (filePath: string) {
  try {
    const configContent = await fs.readFile(filePath, 'utf8');
    const config = JSON.parse(configContent);
    return config;
  } catch (e) {
    console.log(`Error reading file at ${filePath}`, e);
    throw new Error(`Error reading file at ${filePath}`);
  }
}

export async function writeFile (filePath: string, data: Record<string, unknown>) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.log(`Error writing data to file at ${filePath}`, e);
    throw new Error(`Error writing data to file at ${filePath}`);
  }
}