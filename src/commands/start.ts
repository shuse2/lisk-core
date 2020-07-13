/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Command, flags as flagParser } from '@oclif/command';
import fs from 'fs-extra';
import { ApplicationConfig, GenesisBlockJSON } from 'lisk-sdk';
import {
	getDefaultPath,
	splitPath,
	getConfigPath,
	getDefaultConfigPath,
	getNetworkConfigFilesPath,
	getFullPath,
} from '../utils/path';
import { getApplication } from '../application';

const LOG_OPTIONS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const DEFAULT_NETWORK = 'mainnet';

export default class StartCommand extends Command {
	static description = 'Start Lisk Core Node with given config parameters';

	static examples = [
		'start',
		'start --network dev --data-path ./data --log debug',
	];

	static flags = {
		'data-path': flagParser.string({
			char: 'd',
			description: 'Directory path to specify where node data is stored. Environment variable "LISK_DATA_PATH" can also be used.',
			env: 'LISK_DATA_PATH',
		}),
		network: flagParser.string({
			char: 'n',
			description: 'Default network config to use. Environment variable "LISK_NETWORK" can also be used.',
			env: 'LISK_NETWORK',
		}),
		config: flagParser.string({
			char: 'c',
			description: 'File path to a custom config. Environment variable "LISK_CONFIG_FILE" can also be used.',
			env: 'LISK_CONFIG_FILE',
		}),
		port: flagParser.integer({
			char: 'p',
			description: 'Open port for the peer to peer incoming connections. Environment variable "LISK_PORT" can also be used.',
			env: 'LISK_PORT',
		}),
		'enable-ipc': flagParser.boolean({
			description: 'Enable IPC communication.',
			default: false,
		}),
		'console-log': flagParser.string({
			description: 'Console log level. Environment variable "LISK_CONSOLE_LOG_LEVEL" can also be used.',
			env: 'LISK_CONSOLE_LOG_LEVEL',
			options: LOG_OPTIONS,
		}),
		log: flagParser.string({
			char: 'l',
			description: 'File log level. Environment variable "LISK_FILE_LOG_LEVEL" can also be used.',
			env: 'LISK_FILE_LOG_LEVEL',
			options: LOG_OPTIONS,
		}),
		peer: flagParser.string({
			char: 'x',
			description: 'Seed peer to initially connect to in format of "ip:port".',
			multiple: true,
		}),
		'enable-http-api': flagParser.boolean({
			description: 'Enable HTTP API Plugin.',
			default: false,
		}),
	};

	// eslint-disable-next-line @typescript-eslint/require-await
	async run(): Promise<void> {
		const { flags } = this.parse(StartCommand);
		const dataPath = flags['data-path'] ? flags['data-path'] : getDefaultPath();
		this.log(`Starting Lisk Core at ${getFullPath(dataPath)}`);
		const pathConfig = splitPath(dataPath);
		// Make sure data path exists
		await fs.ensureDir(dataPath);

		// Copy all default configs to datapath if not exist
		const configPath = await this._getConfigPath(dataPath);
		const networkConfigs = await this._getNetworkConfigPath(dataPath, configPath, flags.network);

		// Get genesis block using the network config
		const genesisBlock: GenesisBlockJSON = await fs.readJSON(networkConfigs.genesisBlockFilePath);
		// Get config from network config or config specifeid
		const configFilePath = flags.config ?? networkConfigs.configFilePath;
		const config: ApplicationConfig = await fs.readJSON(configFilePath);

		config.rootPath = pathConfig.rootPath;
		config.label = pathConfig.label;
		config.version = this.config.pjson.version;
		// Inject other properties specified
		if (flags['enable-ipc']) {
			config.ipc = { enabled: flags['enable-ipc'] };
		}
		if (flags['console-log']) {
			config.logger = config.logger ?? {};
			config.logger.consoleLogLevel = flags['console-log'];
		}
		if (flags.log) {
			config.logger = config.logger ?? {};
			config.logger.fileLogLevel = flags.log;
		}
		if (flags.port) {
			config.network = config.network ?? {};
			config.network.port = flags.port;
		}
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (flags.peer) {
			config.network = config.network ?? {};
			config.network.seedPeers = [];
			for (const seed of flags.peer) {
				const [ip, port] = seed.split(':');
				if (!ip || !port || Number.isNaN(Number(port))) {
					this.error('Invalid ip or port is specified.');
				}
				config.network.seedPeers.push({ ip, port: Number(port) });
			}
		}

		// Get application and start
		try {
			const app = getApplication(genesisBlock, config, { enableHTTPAPI: flags['enable-http-api'] });
			await app.run();
		} catch (errors) {
			this.error(
				Array.isArray(errors)
					? errors.map(err => (err as Error).message).join(',')
					: errors,
			);
		}
	}

	private async _getConfigPath(dataPath: string): Promise<string> {
		const configPath = getConfigPath(dataPath);
		if (!fs.existsSync(configPath)) {
			const defaultConfigPath = getDefaultConfigPath();
			this.log(`Copying files from ${defaultConfigPath} to ${configPath}`);
			await fs.ensureDir(configPath);
			await fs.copy(defaultConfigPath, configPath, { recursive: true });
		}
		return configPath
	}

	private async _getNetworkConfigPath(dataPath: string, configPath: string, networkInput?: string): Promise<{ genesisBlockFilePath: string, configFilePath: string }> {
		const configDirs = await fs.readdir(configPath);
		const network = networkInput ?? DEFAULT_NETWORK;
		// If network is specified, check if the config folder exists
		if (!configDirs.includes(network)) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			this.error(new Error(`Network must be one of ${configDirs.join(',')}`));
		}
		return getNetworkConfigFilesPath(dataPath, network);
	}
}