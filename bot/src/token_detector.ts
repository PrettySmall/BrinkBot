import dotenv from 'dotenv';

import { NATIVE_MINT } from '@solana/spl-token';
import {
	Connection,
	PublicKey,
} from '@solana/web3.js';

import * as bot from './bot';
import * as botLogic from './bot_logic';
import * as database from './db';
import * as global from './global';
import * as utils from './utils';
import * as dextool from './dextoolsAPI'
import { getPoolInfo } from './dexscreenerAPI';
import * as birdEye from './birdeyeAPI';

dotenv.config()

const RAYDIUM_PUBLIC_KEY = ('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const raydium = new PublicKey(RAYDIUM_PUBLIC_KEY);
// const connection = new Connection(global.get_net_rpc(), {
// 	wsEndpoint: global.get_net_wss()
// });


let processedSignatures = new Set();
let detectionSignalMap = new Set();

export const addUser = (chatid: string) => {
	detectionSignalMap.add(chatid)
}

export const deleteUser = (chatid: string) => {
	detectionSignalMap.delete(chatid)
}

async function main(connection: any, raydium: any) {
	console.log('Monitoring logs...', raydium.toString());
	connection.onLogs(raydium, ({ logs, err, signature }: any) => {
		if (err) return;
		if (logs && logs.some((log: any) => log.includes('initialize2') && !processedSignatures.has(signature))) {
			processedSignatures.add(signature);
			fetchRaydiumAccounts(signature, connection);
		}
	}, "finalized");
}

const getTokenFilterData = async (addr: string) => {
	try {
		const tokenData: any = {}
		let data: any = await dextool.getTokenBaseInfo(addr)
		tokenData.addr = addr
		tokenData.symbol = data.symbol
		tokenData.decimal = data.decimals
		data = await dextool.getTokenPriceInfo(addr)
		tokenData.immpact = data.variation5m
		data = await dextool.getTokenAudit(addr)
		tokenData.mintable = data.isMintable == "yes"
		data = await dextool.getTokenLockInfo(addr)
		tokenData.locked = data.amountLocked > 0
		// const poolInfo: any = fastswap.findPoolInfoForTokens(tokenData.addr, NATIVE_MINT.toString())
		// data = await dextool.getPoolLiquidityInfo(poolInfo.lpMint)
		// tokenData.liquidity = data.liquidity
		return tokenData
	} catch (error) {
		console.log(error);
		return null
	}
}

async function fetchRaydiumAccounts(signature: any, connection: any) {
	try {
		const txId = signature;
		const tx = await connection.getParsedTransaction(txId, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
		const accounts = tx?.transaction?.message?.instructions.find((ix: any) => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY).accounts;

		if (!accounts) {
			return;
		}
		const tokenAIndex = 8;
		const tokenBIndex = 9;

		let newToken: string = ""
		const tokeAAccount: any = accounts[tokenAIndex];
		const tokeBAccount: any = accounts[tokenBIndex];
		if (tokeAAccount.toString() === NATIVE_MINT.toString()) {
			newToken = tokeBAccount.toString()
		} else {
			newToken = tokeAAccount.toString()
		}

		for (let item of detectionSignalMap) {
			const user: any = await database.selectUser({ chatid: item })
			if (user) {
				const data: any = await getTokenFilterData(newToken)
				if (!data) {
					continue
				}
				if (user.isAutoBuy) {
					if (user.detectLocked) {
						if (!data.locked) {
							continue
						}
					}
					if (user.detectMintable) {
						if (!data.mintable) {
							continue
						}
					}
					if (user.detectSolAmount) {
						const solAmount: number = data.liquidity / 2 / ((await dextool.getTokenPriceInfo(newToken)).price)
						if (user.solDetectionMin > solAmount || user.solDetectionMax < solAmount) {
							continue
						}
					}
					if (user.detectPoolChanged) {
						if (data.immpact > user.poolChanged) {
							continue
						}
					}
					await botLogic.registerToken(item as string, newToken, data.symbol, data.decimal)
					const token: any = await database.selectToken({ chatid: item as string, addr: newToken })
					const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
					const solAmount: number = await utils.getWalletSOLBalance(depositWallet)
					// if (solAmount - token.autoBuyAmount > 0) { //Babybear ???
					// 	botLogic.buy(item as string, newToken, token.autoBuyAmount)
					// }
				}
				const menu: any = await bot.informPoolDetectionMessage(item as string, newToken)
				if (!menu) {
					continue
				}
				const { messageId, chatid }: any = await bot.openMenu(item as string, 0, menu.title, menu.options)
				bot.addInform(messageId, item as string, newToken)
			}
		}
	} catch (error) {
		console.log(error);
		return null
	}
}

export async function runDetector() {
	// try {
	// 	await main(connection, raydium);
	// } catch (error) {
	// 	runDetector();
	// }
}