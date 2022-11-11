/*
 * Copyright © 2022 Lisk Foundation
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
 */
export const TRANSACTIONS_PER_ACCOUNT = 20;
export const DEFAULT_TX_FEES = BigInt('10000000');
export const ACCOUNT_INITIALIZATION_FEE = BigInt('5000000');
export const NUM_OF_ROUNDS = 3;
export const TAG_MULTISIG_REG = 'LSK_RMSG_';
export const TAG_TRANSACTION = 'LSK_TX_';
export const MNEMONIC_LENGTH = 256;
export const LOCAL_ID = '00000000';

export const MODULE_TOKEN = 'token';
export const COMMAND_TOKEN_TRANSFER = 'transfer';

export const MODULE_DPOS = 'dpos';
export const COMMAND_DPOS_REGISTER_DELEGATE = 'registerDelegate';
export const COMMAND_DPOS_VOTE_DELEGATE = 'voteDelegate';
export const COMMAND_DPOS_UPDATE_GENERATOR_KEY = 'updateGeneratorKey';

export const MODULE_AUTH = 'auth';
export const COMMAND_AUTH_REGISTER_MULTISIGNATURE = 'registerMultisignature';