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
	BaseCommand,
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	validator as liskValidator,
	cryptography,
	TokenMethod,
} from 'lisk-sdk';

import { ADDRESS_LEGACY_RESERVE } from '../constants';

import { reclaimParamsSchema } from '../schemas';
import { ReclaimParamsData, TokenIDReclaim } from '../types';
import { getLegacyAddress } from '../utils';
import { LegacyAccountStore } from '../stores/legacyAccountStore';
import { ReclaimEvent } from '../events/reclaim';

// eslint-disable-next-line prefer-destructuring
const validator: liskValidator.LiskValidator = liskValidator.validator;
const {
	address: { getAddressFromPublicKey },
} = cryptography;

export class ReclaimLSKCommand extends BaseCommand {
	public schema = reclaimParamsSchema;
	public legacyReserveAddress = ADDRESS_LEGACY_RESERVE;
	private _tokenMethod!: TokenMethod;
	private _tokenIDReclaim!: TokenIDReclaim;

	public addDependencies(tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
	}

	public init(args: { tokenIDReclaim: TokenIDReclaim }) {
		this._tokenIDReclaim = args.tokenIDReclaim;
	}

	public async verify(ctx: CommandVerifyContext): Promise<VerificationResult> {
		const params = (ctx.params as unknown) as ReclaimParamsData;

		try {
			validator.validate(reclaimParamsSchema, params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const legacyAddress = getLegacyAddress(ctx.transaction.senderPublicKey);
		const legacyStore = this.stores.get(LegacyAccountStore);

		const isLegacyAddressExists = await legacyStore.has(ctx, legacyAddress);

		if (!isLegacyAddressExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Public key does not correspond to a reclaimable account.`),
			};
		}

		const legacyAccount = await legacyStore.get(ctx, legacyAddress);

		if (legacyAccount.balance !== params.amount) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Input amount does not equal the balance of the legacy account.'),
			};
		}

		return { status: VerifyStatus.OK };
	}

	public async execute(ctx: CommandExecuteContext): Promise<void> {
		const params = (ctx.params as unknown) as ReclaimParamsData;
		const legacyAddress = getLegacyAddress(ctx.transaction.senderPublicKey);
		const legacyStore = this.stores.get(LegacyAccountStore);
		await legacyStore.del(ctx, legacyAddress);

		const address = getAddressFromPublicKey(ctx.transaction.senderPublicKey);

		await this._tokenMethod.unlock(
			ctx.getMethodContext(),
			this.legacyReserveAddress,
			this.name,
			this._tokenIDReclaim,
			params.amount,
		);

		await this._tokenMethod.transfer(
			ctx.getMethodContext(),
			this.legacyReserveAddress,
			address,
			this._tokenIDReclaim,
			params.amount,
		);

		const reclaimEvent = this.events.get(ReclaimEvent);
		reclaimEvent.log(ctx.getMethodContext(), {
			legacyAddress,
			address,
			amount: params.amount,
		});
	}
}
