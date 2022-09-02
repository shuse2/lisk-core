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
import {
	BaseEndpoint,
	JSONObject,
	ModuleEndpointContext,
	chain,
	cryptography,
	validator as liskValidator,
} from 'lisk-sdk';
import { legacyAccountRequestSchema } from './schemas';
import { LegacyAccountStore } from './stores/legacyAccountStore';
import { LegacyStoreData } from './types';

// eslint-disable-next-line prefer-destructuring
const validator: liskValidator.LiskValidator = liskValidator.validator;

const {
	legacyAddress: { getLegacyAddressFromPublicKey },
} = cryptography;
const { NotFoundError } = chain;

export class LegacyEndpoint extends BaseEndpoint {
	public async getLegacyAccount(
		ctx: ModuleEndpointContext,
	): Promise<JSONObject<LegacyStoreData> | undefined> {
		validator.validate(legacyAccountRequestSchema, ctx.params);

		const publicKey = Buffer.from(ctx.params.publicKey as string, 'hex');
		const legacyStore = this.stores.get(LegacyAccountStore);

		try {
			const legacyAddress = getLegacyAddressFromPublicKey(publicKey);
			const isLegacyAddressExists = await legacyStore.has(ctx, publicKey);
			if (!isLegacyAddressExists) {
				return {
					legacyAddress,
					balance: '0',
				};
			}
			const legacyAccount = await legacyStore.get(ctx, Buffer.from(legacyAddress, 'hex'));
			return {
				legacyAddress,
				balance: legacyAccount.balance.toString(),
			};
		} catch (err) {
			if (err instanceof NotFoundError) {
				return undefined;
			}
			throw err;
		}
	}
}
