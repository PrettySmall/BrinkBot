import * as afx from './global'
import * as utils_solana from './utils'
import * as utils_base from './base/utils_base'
// import * as bot from './bot'

import dotenv from 'dotenv';
dotenv.config()

import { Connection } from '@solana/web3.js';
import Web3 from 'web3'
import { getHttpEndpoint, getHttpV4Endpoint } from "@orbs-network/ton-access";
import { TonClient4, WalletContractV4, internal, WalletContractV5R1 } from "@ton/ton";

import { utils } from 'ethers/src.ts';
import { token } from '@metaplex-foundation/js';
import { Keypair } from '@solana/web3.js';
import { before } from 'node:test';

const options = {
	reconnect: {
		auto: true,
		delay: 5000, // ms
		maxAttempts: 5,
		onTimeout: false
	}
};

export async function initUtils(chainMode: number) {

    let b_OK: boolean = false;
    let web3: string = ""
    let web3Http: string = ""

    web3        = String(process.env.ETHEREUM_RPC_URL)
    web3Http    = String(process.env.ETHEREUM_RPC_HTTP_URL)
    
    const web3Inst: any = new Web3(new Web3.providers.WebsocketProvider(web3, options))
    const web3HttpInst: any = new Web3(web3Http)

    console.log(`----------------- EVM chain(${afx.get_chain_name(chainMode).toUpperCase()}) is updtated with web3 module`)
    utils_base.init(web3Inst, web3HttpInst)
    
    return true;
}

export interface MultiBotFee {
    swapOrgFee: number,
    refRewardFee: number,
    swapFee: number,
}

export const calcFee = (amount: number, session: any, rewardAvailable: boolean): MultiBotFee => {

    const swapOrgFee = amount * afx.Swap_Fee_Percent / 100.0
    let refRewardFee

    if (rewardAvailable && session.referredBy) {

        const now = new Date().getTime()

        let monthSpent = 0
        if (session.referredTimestamp) {
            monthSpent = (now - session.referredTimestamp) / (1000 * 60 * 60 * 24 * 30)
        }

        let rewardPercent = 10
        if (monthSpent > 2) {
            rewardPercent = 10
        } else if (monthSpent > 1) {
            rewardPercent = 20
        } else {
            rewardPercent = 30
        }

        refRewardFee = swapOrgFee * rewardPercent / 100.0
    } else {
        refRewardFee = 0
    }

    const swapFee = swapOrgFee - refRewardFee

    return { swapOrgFee, refRewardFee, swapFee }
}

export async function isValidPrivateKey(privateKey: string, chainMode: number) {

    let b_OK: boolean = false;

    b_OK = utils_base.isValidPrivateKey(privateKey);

    return b_OK;
}

export function isValidWalletAddress(pubKey: string, chainMode: number) {

    let b_OK: boolean = false;

    // console.log(`@@@ isValidWalletAddress function starting.........`)
    
    b_OK = utils_base.isValidWalletAddress(pubKey);

    return b_OK;
}

export function isValidAddress(tokenAddr: string, chain_mode: number) {

    let b_OK: boolean = false;
   
    b_OK = utils_base.isValidAddress(tokenAddr);

    return b_OK;
}

export const getNativeCurrencyPrice = async (chainID: number): Promise<number> => {

    let nativeTokenPrice = 0

    
    nativeTokenPrice = await utils_base.getEthPrice()
    

    return nativeTokenPrice
}

export const getDepositWallet = async (database: any, sessionId: string): Promise<any> => {

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) return null

    let privateKey = null
    
    privateKey = user.baseDepositWallet

    return privateKey
}

export const setDepositWallet = async (database: any, privateKey: string, sessionId: string) => {

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) return false

    user.baseDepositWallet = privateKey

    console.log(`==============[${user.username}: ${afx.get_chain_name(user.lastUsedChainMode)} DepositWallet] : = ${privateKey} is updated successfully`)
    await database.updateWallet(user)
    await user.save()

    return true
}

export const getTokenInfo = async (address: string, chainMode: number): Promise<any> => {

    let tokenInfo: any = null

    tokenInfo = await utils_base.getTokenInfo(address)

    if (tokenInfo)
    {
        console.log(`[getTokenInfo] : ==============  tokenInfo : = ${tokenInfo.exist}, symbol = ${tokenInfo.symbol}, decimal = ${tokenInfo.decimal},  ${tokenInfo?.name!}`)
        return tokenInfo
    }
    else
    {
        return { exist: false, symbol: "", decimal: 0 };
    }
}    

export const getBaseTokenInfo = async (chatid: string, chain_mode: number): Promise<any|null> => {

    let tokenInfo: any = null
    let chainMode = chain_mode; //afx.get_chain_mode()

    tokenInfo = utils_base.getBaseTokenInfo(chainMode)

    if (tokenInfo)
    {
        // console.log(`[getBaseTokenInfo] : ==============  tokenInfo : = ${tokenInfo.baseAddr}, symbol = ${tokenInfo.baseSymbol}, decimal = ${tokenInfo.baseDecimal}`)
        return tokenInfo
    }
    else
    {
        console.log(`[getBaseTokenInfo] : ==============  tokenInfo : = None`)
        return { baseAddr: '', baseSymbol: "", baseDecimal: 0 };
    }
}

export const getTokenBalanceOfWallet = async (wallet: any, tokenAddr: any, tokenDecimal: number, chainMode: number) : Promise<number> => {

    let tokenBalance: number = 0;
    
    tokenBalance = await utils_base.getTokenBalanceFromWallet(utils_base.web3Inst, wallet.depositPubKey, tokenAddr)            
            
    return tokenBalance
}

export const getDepositWalletBalance = async (database: any, sessionId: string) : Promise<any | null> => {

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) return null

    let depositPubKey: any = null;
    let depositBalance: string = "";
    let depositUSDTBalance: string = "";
    let nativeCurrencyBalance: number = 0
    let solDepositWallet: any = null;
    let tonDepositWalletPubkey: any = null;

    depositPubKey = utils_base.getWalletAddressFromPKey(user.baseDepositWallet)
    let ethBalance = await utils_base.getEthBalanceOfWallet(depositPubKey);
    // console.log(`[${user.username}] +++++++++++++++++ eth balance amount = ${ethBalance} ETH`)
    nativeCurrencyBalance = parseFloat(ethBalance)
    depositBalance = utils_base.roundEthUnit(parseFloat(ethBalance), 5)
    const currentETHPrice = await utils_base.getEthPrice();
    depositUSDTBalance = utils_base.roundDecimal((parseFloat(ethBalance) * currentETHPrice), 3);

    return { depositPubKey, depositBalance, depositUSDTBalance, nativeCurrencyBalance, solDepositWallet, tonDepositWalletPubkey }
}

export const getReferralWalletBalance = async (database: any, sessionId: string) : Promise<any | null> => {

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) return null

    let referralPubKey: any = null;
    let referralBalance: string = "";
    let referralUSDTBalance: string = "";
    let nativeCurrencyBalance: number = 0
    let solReferralWallet: any = null;

    referralPubKey = utils_base.getWalletAddressFromPKey(user.baseReferralWallet)
    let ethBalance = await utils_base.getEthBalanceOfWallet(referralPubKey);
    // console.log(`[${user.username}] +++++++++++++++++ eth balance amount = ${ethBalance} ETH`)
    nativeCurrencyBalance = parseFloat(ethBalance)
    referralBalance = utils_base.roundEthUnit(parseFloat(ethBalance), 5)
    const currentETHPrice = await utils_base.getEthPrice();
    referralUSDTBalance = utils_base.roundDecimal((parseFloat(ethBalance) * currentETHPrice), 3);

    return { referralPubKey, referralBalance, referralUSDTBalance, nativeCurrencyBalance, solReferralWallet }
}

export const isHasBalanceOfDepositWallet = async (database: any, sessionId: string) : Promise<boolean> => {

    let bHasBalance: boolean = false
    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) return false

    let depositPubKey: any = null;
    let depositBalance: number = 0;

    depositPubKey = utils_base.getWalletAddressFromPKey(user.baseDepositWallet)
    let ethBalance = await utils_base.getEthBalanceOfWallet(depositPubKey);
    // console.log(`[${user.username}] : [isHasBalanceOfDepositWallet] +++++++++++++++++ eth balance amount = ${ethBalance} ETH`)
    depositBalance = parseFloat(ethBalance)

    if(depositBalance <= 0)
    {
        console.log(`[${user.username}] -> no ${afx.get_quote_name(user.lastUsedChainMode).toUpperCase()} balance in your deposit wallet`)
        return false   
    }

    return true
}

export const get_chainscan_url = (url: string, chainMode: number): string => {

    let prefix = "";

    prefix = `https://explorer.inkonchain.com/tx/${url}`
           
    return prefix
};

export const get_round_unit = (poolsize: number, chainMode: number): string => {

    let nativeCurrencyStr = "";

    nativeCurrencyStr = utils_base.roundEthUnit(poolsize, 5)
    return nativeCurrencyStr
};

export const get_scan_url = (chainMode: number): string => {

    let scanUrl = ""
       
    scanUrl = "inkscan"

    return scanUrl;
};