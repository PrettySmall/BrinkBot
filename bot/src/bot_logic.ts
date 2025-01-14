import assert from 'assert';

import { NATIVE_MINT } from '@solana/spl-token';
import { VersionedTransaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { amount } from '@metaplex-foundation/js';
import { userInfo } from 'os';
import { session } from 'passport';
import base58 from "bs58";

import * as bot from './bot';
import * as database from './db';
// import * as dex from './dexscreenerAPI';
import * as global from './global';
// import * as Detector from './token_detector';
import * as constants from './uniconst';
import * as utils from './utils';
import * as dextoolsAPI from './dextoolsAPI';
import * as birdeyeAPI from './birdeyeAPI'

import * as multichainAPI from './multichainAPI'


const fetchTokenPrice = async () => {
    const users: any = await database.selectUsers()
    // const users: any = database.selectUsers() // ??????

    // console.log(`[fetchTokenPrice] : start--------------------------- ${users.length}`)

    if (!users.length) {
        return
    }

    for (let user of users) {
        const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
        
        const tokenAccounts: any = await utils.getWalletTokenAccount(new PublicKey(depositWallet.publicKey), false)
        for (let tokenAccount of tokenAccounts) {
 
            // console.log("[fetchTokenPrice]: TokenAccount loop ------------------------", tokenAccount.accountInfo.mint)

            const addr: string = tokenAccount.accountInfo.mint.toString()
            const token: any = await database.selectToken({ chatid: user.chatid, addr })
            if(!token) return
            
            // console.log("[fetchTokenPrice]: Sell Token exist ------------------------")

            const tokenBalance: number = Number(tokenAccount.accountInfo.amount) / (10 ** token.decimal);            
            if (tokenBalance && token.isAutoSell) {
                // const data: any = await dextoolsAPI.getTokenPriceInfo(addr)
                const data: any = await birdeyeAPI.getTokenPriceInfo_Birdeye(addr, user.lastUsedChainMode)
                let cur_price: number = 0
                if(data && data.value) cur_price = data.value

                console.log(`[fetchTokenPrice] -> token : buyPrice = ${token.buyPrice}, curPrice = ${cur_price}`)

                const hAmount: number = (100 + token.takeProfit) / 100
                const lAmount: number = (100 - token.stopLoss) / 100
                if (token.buyPrice * hAmount <= cur_price || token.buyPrice * lAmount >= cur_price) {
                    sell(user.chatid, addr, user.autoSellAmount)

                    token.isAutoSell = false
                    await token.save()
                }
            }
        }
    }
}

// setInterval(() => { fetchTokenPrice() }, constants.FETCH_INTERVAL)

export const registerToken = async (
    chatid: string, // this value is not filled in case of web request, so this could be 0
    addr: string,
    symbol: string,
    decimal: number,
    chainID: number = global.get_chain_mode(),
    sellPercentAmount: number = 0
) => {
    if (await database.selectToken({ chatid, addr, chainID: chainID})) {
        return constants.ResultCode.SUCCESS
    }

    const { baseAddr, baseSymbol, baseDecimal }: any = await multichainAPI.getBaseTokenInfo(chatid, chainID)

    // const regist = await database.registToken({ chatid, addr, symbol, decimal, baseAddr: NATIVE_MINT.toString(), baseSymbol: "SOL", baseDecimal: 9 , chainID: chainID})
    const regist = await database.registToken({ chatid, addr, symbol, decimal, baseAddr: baseAddr, baseSymbol: baseSymbol, baseDecimal: baseDecimal , chainID: chainID, sellAmount:sellPercentAmount})
    if (!regist) {
        return constants.ResultCode.INTERNAL
    }
    return constants.ResultCode.SUCCESS
};

export const divideToWallets = async (chatid: string) => {
    const session: any = bot.sessions.get(chatid)
    if (!session) {
        return constants.ResultCode.INVALIDE_USER;
    }

    const user: any = await database.selectUser({ chatid })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    let depositWalletSOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
    if (depositWalletSOLBalance <= 0) {
        return constants.ResultCode.USER_INSUFFICIENT_SOL
    }
    const token: any = await database.selectToken({ chatid, addr: session.addr })
    let tax: number = token.targetVolume * constants.SOL_TAX_FEE_PER_1M_VOLUME
    if (token.targetVolume % 0.1) {
        tax++
    }
    if (token.workingTime == 0 || await isNeedPayment(chatid, token.addr)) {
        depositWalletSOLBalance -= tax
    }
    if (depositWalletSOLBalance <= 0) {
        return constants.ResultCode.USER_INSUFFICIENT_ENOUGH_SOL
    }
    if (token.workingTime == 0) {
        depositWalletSOLBalance -= constants.JITO_FEE_AMOUNT
    }
    if (depositWalletSOLBalance <= 0) {
        return constants.ResultCode.USER_INSUFFICIENT_JITO_FEE_SOL
    }
    const divideSolAmount: number = depositWalletSOLBalance / token.walletSize
    if (divideSolAmount <= constants.MIN_DIVIDE_SOL) {
        return constants.ResultCode.USER_INSUFFICIENT_ENOUGH_SOL
    }
    const bundleTransactions: any[] = [];
    const botWallets: any = await database.selectWallets({ chatid })
    
}

export const gatherToWallet = async (chatid: string) => {
    const session: any = bot.sessions.get(chatid)
    if (!session) {
        return constants.ResultCode.INVALIDE_USER;
    }

    const user: any = await database.selectUser({ chatid })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const botWallets: any = await database.selectWallets({ chatid })
    const bundleTransactions: any[] = [];
    
    return constants.ResultCode.SUCCESS;
}

const isNeedPayment = async (chatid: string, addr: string) => {
    const whiteLists: any = await database.WhiteList.find({});
    let whiteList: any = null
    for (let ls of whiteLists) {
        if (ls.chatid === chatid) {
            whiteList = ls
        }
    }
    const token: any = await database.selectToken({ chatid, addr })
    if (whiteList) {
        const tokens: any = await database.selectTokens({ chatid })
        let runningBotCount: number = 0
        for (let token of tokens) {
            if (token.currentVolume) {
                runningBotCount++
            }
        }
        if (runningBotCount <= whiteList.limitTokenCount) {
            return false
        } else {
            return true
        }
    }
    return token.currentVolume > token.targetVolume * constants.VOLUME_UNIT ? true : false
}

const catchTax = async (chatid: string, addr: string) => {
    const user: any = await database.selectUser({ chatid })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    let depositWalletSOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
    if (depositWalletSOLBalance <= 0) {
        return constants.ResultCode.USER_INSUFFICIENT_SOL
    }
    const token: any = await database.selectToken({ chatid, addr })
    let tax: number = token.targetVolume * constants.SOL_TAX_FEE_PER_1M_VOLUME
    if (token.targetVolume % 0.1) {
        tax++
    }
    depositWalletSOLBalance -= tax
    if (depositWalletSOLBalance <= 0) {
        return constants.ResultCode.USER_INSUFFICIENT_ENOUGH_SOL
    }

    
}

const sellAllTokens = async (chatid: string, addr: string) => {

    const user: any = await database.selectUser({ chatid })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const token: any = await database.selectToken({ chatid, addr })
    const wallets: any = await database.selectWallets({ chatid })
    const bundleTransactions: any[] = [];
    
   
}

export const withdraw = async (chatid: string, addr: string) => {
    
    try {
        const user: any = await database.selectUser({ chatid })
        if (!user)
            return false
        const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
        const depositWalletSOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
        if (depositWalletSOLBalance <= 0 || user.withdrawAmount <= 0) {
            await bot.sendMessageSync(chatid, `⚠️ There is no SOL amount to transfer`)
            console.log("[withdraw] : error ----- 1 ")
            return false
        }
        // const bundleTransactions: any[] = []
        // const { trx }: any = await swap_manager.transferSOL(database, chatid, depositWallet.secretKey, addr, depositWalletSOLBalance - constants.JITO_BUNDLE_TIP - constants.LIMIT_REST_SOL_AMOUNT)
        // bundleTransactions.push(trx)
        // const result: boolean = await Jito.createAndSendBundleTransaction(bundleTransactions, depositWallet.wallet, constants.JITO_BUNDLE_TIP)
        // if (result) {
        //     console.log("------jito request is successed------");
        // } else {
        //     console.log("------jito request is failed------");
        // }

        let amount: number = (depositWalletSOLBalance - constants.JITO_BUNDLE_TIP - constants.LIMIT_REST_SOL_AMOUNT) * user.withdrawAmount / 100
        // let amount: number = (depositWalletSOLBalance) * user.withdrawAmount / 100
        // amount = 0.001 //Angel testing

        console.log(`SOL balance = ${depositWalletSOLBalance}, withdrawAmount = ${user.withdrawAmount}`)
        const balance = await global.web3Conn.getBalance(depositWallet.wallet.publicKey); //await utils.connection.getBalance(depositWallet.wallet.publicKey);
        const recentBlockhash = await global.web3Conn.getRecentBlockhash();//await utils.connection.getRecentBlockhash();
        const cost = recentBlockhash.feeCalculator.lamportsPerSignature;
        const amountToSend = Math.floor((balance - cost) * user.withdrawAmount / 100);
        
    } catch (error) {
        console.log(`[withdraw] := `, error)
    }
    
    
    return true
}

export const setSlippage = async (chatid: string, addr: string, amount: number) => {
    const token: any = await database.selectToken({ chatid, addr })
    token.buySlippage = amount
    token.sellSlippage = amount
    await token.save()
}

export const setBuySlippage = async (chatid: string, addr: string, amount: number, chain_ID: number) => {
    const token: any = await database.selectToken({ chatid, addr, chainID: chain_ID })
    token.buySlippage = amount
    await token.save()
}

export const setSellSlippage = async (chatid: string, addr: string, amount: number, chain_ID: number) => {
    const token: any = await database.selectToken({ chatid, addr, chainID: chain_ID })
    token.sellSlippage = amount
    await token.save()
}

export const switchMode = async (chatid: string, addr: string, chain_ID: number) => {
    const token: any = await database.selectToken({ chatid, addr, chainID: chain_ID })
    token.mode = !token.mode
    await token.save()
}

export const setBuySwapLimitSetting = async (chatid: string, flag: number) => {
    const user: any = await database.selectUser({ chatid })
    user.buySwapLimit = flag    
    await user.save()
}

export const setBuySolAmount = async (chatid: string, flag: number) => {
    const user: any = await database.selectUser({ chatid })
    user.buySolIdx = flag    
    await user.save()
}

export const setBuySlipIdx = async (chatid: string, flag: number) => {
    const user: any = await database.selectUser({ chatid })
    user.buySlippageIdx = flag    
    await user.save()
}

export const setSellSwapLimitSetting = async (chatid: string, flag: number) => {
    const user: any = await database.selectUser({ chatid })
    user.sellSwapLimit = flag    
    await user.save()
}

export const setSellTokenPercentAmount = async (chatid: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })
    user.sellPercentIdx = amount    
    await user.save()
}

export const setSellSlipIdx = async (chatid: string, flag: number) => {
    const user: any = await database.selectUser({ chatid })
    user.sellSlippageIdx = flag    
    await user.save()
}

export const setNewPairsUpcomingLaunch = async (chatid: string, flag: Boolean) => {
    const user: any = await database.selectUser({ chatid })
    user.newPairsUpcomingLaunch = flag    
    await user.save()
}

export const setWithdrawWallet = async (chatid: string, wallet: string) => {
    const user: any = await database.selectUser({ chatid })
    user.withdrawWallet = wallet    
    await user.save()
}

export const setWithdrawAmountAndIDX = async (chatid: string, amount: number, idx: number) => {
    const user: any = await database.selectUser({ chatid })
    user.withdrawAmount = amount
    user.withdrawIdx = idx    
    await user.save()
}

export const setAutoBuyEnable = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })
    user.stAutoBuyEnabled = !user.stAutoBuyEnabled
   
    await user.save()
}

export const setAutoBuyAmount_1 = async (chatid: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })
    user.buySolIdx = 6;
    user.stAutoBuyAmount = amount;
    await user.save()
}

export const setAutoBuySlippage = async (chatid: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })
    
    user.stAutoBuySlippage = amount;
    await user.save()
}

export const setAutoSellSlippage = async (chatid: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })
    
    user.stAutoSellSlippage = amount;
    await user.save()
}

export const setTrxPriority = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })

    user.stTrxPriorityIdx = (user.stTrxPriorityIdx + 1) % 3
    switch (user.stTrxPriorityIdx){
        case 0: user.stTrxPriorityFee = 0.001; break;
        case 1: user.stTrxPriorityFee = 0.005; break;
        case 2: user.stTrxPriorityFee = 0.01; break;
    }
    
    await user.save()
}

export const setMevProtect = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })

    user.stMevProtectEnabled = !user.stMevProtectEnabled
    if (user.stMevProtectEnabled)
        user.stMevProtectFee = 0.03
    
    await user.save()
}

export const setUserChainMode = async (chatid: string, chainMode: number) => {
    const user: any = await database.selectUser({ chatid })

    user.lastUsedChainMode = chainMode
    
    await user.save()
}

export const setAutoPriorityFee = async (chatid: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })

    user.stTrxPriorityIdx = 4;
    user.stTrxPriorityFee = amount;
    
    await user.save()
}

export const setSettingBuyAmount = async (chatid: string, amount: number, direct: boolean) => {
    const user: any = await database.selectUser({ chatid })
    
    if(direct)
    {
        user.stBuyRightAmount = amount;
    }
    else
    {
        user.stBuyLeftAmount = amount;
    } 
    
    await user.save()
}


export const setSettingSellAmount = async (chatid: string, amount: number, direct: boolean) => {
    const user: any = await database.selectUser({ chatid })
    
    if(direct)
    {
        user.stSellRightAmount = amount;
    }
    else
    {
        user.stSellLeftAmount = amount;
    } 
    
    await user.save()
}

export const switchAutoDetection = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })
    user.isAutoDetect = !user.isAutoDetect
    // if (user.isAutoDetect) {
    //     Detector.addUser(chatid)
    // } else {
    //     Detector.deleteUser(chatid)
    // }
    await user.save()
}

export const taxProc = async (chatid: string, tax_amount: number) => {

    const session: any = bot.sessions.get(chatid)
    if (!session) {
        return constants.ResultCode.INVALIDE_USER;
    }

    const user: any = await database.selectUser({ chatid })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const depositWalletSOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
    if (depositWalletSOLBalance <= 0 || tax_amount <= 0) {
        console.log("tax amount is less than zero")
        return false
    }
    
    let amount: number = (depositWalletSOLBalance - constants.JITO_BUNDLE_TIP - constants.LIMIT_REST_SOL_AMOUNT) * user.withdrawAmount / 100
    
    const balance = await global.web3Conn.getBalance(depositWallet.wallet.publicKey); //await utils.connection.getBalance(depositWallet.wallet.publicKey);
    const recentBlockhash = await global.web3Conn.getRecentBlockhash();//await utils.connection.getRecentBlockhash();
    const cost = recentBlockhash.feeCalculator.lamportsPerSignature;

    const taxLamperts = Math.floor(tax_amount * LAMPORTS_PER_SOL)

    console.log("balance = ", balance)
    console.log("transfer fee = ", cost)
    console.log("taxToSend = ", taxLamperts)
    
    return true
}


const TaxReward = async (chatid: string, referralreward: number, from: any) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }

    const referralUser: any = await database.selectUser({ chatid: user.referredBy })
    if (referralUser) {

        const rewardLamperts = Math.floor(referralreward * LAMPORTS_PER_SOL)
       
    }
}

const ReferralReward = async (chatid: string, referralReward: number, from: any) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }

    const referralUser: any = await database.selectUser({ chatid: user.referredBy })
    if (referralUser) {

        const rewardLamperts = Math.floor(referralReward * LAMPORTS_PER_SOL)
       
        const refWallet: any = utils.getWalletFromPrivateKey(referralUser.referralWallet)
    }
}

export const buy = async (chatid: string, addr: string, amount1: number, sendMsg: Function) => {
    const session: any = bot.sessions.get(chatid)
    if (!session) {
        console.log(`[${chatid}] buy session is expire`)
        return constants.ResultCode.INVALIDE_USER;
    }

    const user: any = await database.selectUser({ chatid })
    if (!user) {
        console.log(`[${chatid}] user is not exist`)
        return
    }

    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const SOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
    const SOLBalanceLamports: number = await utils.getWalletSOLBalanceLamports(depositWallet)
}

export const sell = async (chatid: string, addr: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const token: any = await database.selectToken({ chatid, addr, chainID: user.lastUsedChainMode })
    let tokenBalance: number = await utils.getWalletTokenBalance(depositWallet, token.addr, token.decimal)

    let sellTokenBalance: number = 0;
    if (amount) {
        sellTokenBalance = tokenBalance * amount / 100
    }

}

export const switchAutoBuyMode = async (chatid: string, addr: string) => {
    const token: any = await database.selectToken({ chatid, addr })
    if (!token) {
        return
    }
    token.isAutoBuy = !token.isAutoBuy
    await token.save()
}

export const switchAutoSellMode = async (chatid: string, addr: string, chain_ID: number) => {
    const token: any = await database.selectToken({ chatid, addr, chainID: chain_ID })
    if (!token) {
        return
    }
    token.isAutoSell = !token.isAutoSell
    await token.save()
}

export const setTakeProfit = async (chatid: string, addr: string, amount: number, chain_ID: number) => {
    const token: any = await database.selectToken({ chatid, addr, chainID: chain_ID })
    if (!token) {
        return
    }
    token.takeProfit = amount
    await token.save()
}

export const setStopLoss = async (chatid: string, addr: string, amount: number, chain_ID: number) => {
    const token: any = await database.selectToken({ chatid, addr, chainID: chain_ID })
    if (!token) {
        return
    }
    token.stopLoss = amount
    await token.save()
}

export const setAutoBuyAmount = async (chatid: string, addr: string, amount: number) => {
    const token: any = await database.selectToken({ chatid, addr })
    if (!token) {
        return
    }
    token.autoBuyAmount = amount
    await token.save()
}

export const setAutoSellAmount = async (chatid: string, addr: string, amount: number) => {
    const token: any = await database.selectToken({ chatid, addr })
    if (!token) {
        return
    }
    token.autoSellAmount = amount
    await token.save()
}

export const setPriority = async (chatid: string, addr: string, amount: number) => {
    const token: any = await database.selectToken({ chatid, addr })
    if (!token) {
        return
    }
    token.priority = amount
    await token.save()
}

export const setPoolDetectionAmount = async (chatid: string, min: number, max: number) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    user.solDetectionMin = min
    user.solDetectionMax = max
    await user.save()
}

export const switchPoolDetectionPoolAmount = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    user.detectSolAmount = !user.detectSolAmount
    await user.save()
}

export const setPoolDetectionChangedPercent = async (chatid: string, amount: number) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    user.poolChanged = amount
    await user.save()
}

export const switchPoolDetectionPoolChanged = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    user.detectPoolChanged = !user.detectPoolChanged
    await user.save()
}

export const switchPoolDetectionPoolLocked = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    user.detectLocked = !user.detectLocked
    await user.save()
}

export const switchPoolDetectionMintable = async (chatid: string) => {
    const user: any = await database.selectUser({ chatid })
    if (!user) {
        return
    }
    user.detectMintable = !user.detectMintable
    await user.save()
}