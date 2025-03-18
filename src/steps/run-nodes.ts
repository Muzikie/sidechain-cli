import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
async function runCommandInTab(command: string): Promise<void> {
	try {
		console.log(`Running: ${command} in terminal tab`);

		const script = `
			osascript -e 'tell application "Terminal"
				activate
				tell application "System Events" to keystroke "t" using command down
				delay 0.5
				do script "${command}" in selected tab of the front window
			end tell'`;

		// Execute the AppleScript
		await execAsync(script);
	} catch (error) {
		console.error(`Error running command in tab:`, error);
		throw error;
	}
}

async function stopNode(nodeName: string): Promise<void> {
	try {
		console.log(`Stopping node: ${nodeName}`);
		await execAsync(`osascript -e 'tell application "Terminal"
			activate
			do script "killall ${nodeName}" in selected tab of the front window
		end tell'`);
		console.log(`${nodeName} stopped successfully.`);
	} catch (error) {
		console.error(`Error stopping node ${nodeName}:`, error);
		throw error;
	}
}

export async function restartNode(
	nodeName: string,
	startCommand: string,
): Promise<void> {
	await stopNode(nodeName);
	await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds to ensure node stops completely
	await runCommandInTab(startCommand);
	console.log(`${nodeName} restarted successfully.`);
}

export async function startNodes(): Promise<void> {
	try {
		// Step 1: Run mainchain relay node
		await runCommandInTab(
			`klayr-core start --network testnet --enable-chain-connector-plugin`,
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Step 2: Run side chain seed node
		await runCommandInTab(`seed start`);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Step 3: Run side chain relay node
		await runCommandInTab(`relay start`);

		// Step 4: Wait for nodes to run for 10 seconds
		console.log('Waiting for 10 seconds to ensure nodes are running...');
		await new Promise(resolve => setTimeout(resolve, 10000));

		console.log('Chain connector plugin activated successfully!');
	} catch (error) {
		console.error('Error during node startup or activation:', error);
	}
}
