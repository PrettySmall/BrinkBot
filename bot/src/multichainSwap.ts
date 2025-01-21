import * as afx from './global'

import * as solana_swap from './bot_logic'
import * as base_swap from './base/swap_bot'

import * as utils_base from './base/utils_base'
import { assert } from 'console'
import { utils } from 'ethers'
import { sendMessage } from './bot'

export const buy = async (tokenAddr: string, database: any, sessionId: string, sendMsg: (msg: string) => void, callback: (param: any)=>void) => {

    if (!tokenAddr)
    {
        console.log(`[Multichain Buy] : Token Address to buy is invalid`)
        return false
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) {
        console.log(`[Multichain Buy] : User is not exist`)
        return false
    }

    const token: any = await database.selectToken({ chatid: sessionId, addr: tokenAddr, chainID: user.lastUsedChainMode })
    
    console.log(`[${user.username}]: [MultichainBuy] buy sol amount = ${token.buyAmount}`)

    let privateKey = null

           
    assert(utils_base.web3HttpInst)
    await base_swap.buyToken(utils_base.web3HttpInst, database, sessionId, token.addr, token.buyAmount, 'ETH', 'v2', sendMsg )

    console.log(`[Multichain Buy] : Buy is passed`)

    return true
}

export const sell = async (tokenAddr: string, database: any, sessionId: string, sendMsg: ((msg: any) => void) | null = null) => {

    if (!tokenAddr)
    {
        console.log(`[Multichain Sell] : Token Address to sell is invalid`)
        return false
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) {
        console.log(`[Multichain Sell] : User is not exist`)
        return false
    }

    const token: any = await database.selectToken({ chatid: sessionId, addr: tokenAddr, chainID: user.lastUsedChainMode })

    console.log(`[Multichain sell] ====== sell amount := ${token.sellAmount}`)

    let privateKey = null

    if (token.sellAmount <= 0) {
        console.log(`[Multichain Sell] : please enter exactly amount to sell token `)
        return false
    }
   
    assert(utils_base.web3HttpInst)
    await base_swap.sellToken(utils_base.web3HttpInst, database, sessionId, token.addr, token.sellAmount, 'PERCENT', 'v2', 
        async (msg: any) => {
            console.log(`[${user.username}] sellToken := `, msg)
        } 
    )

    console.log(`[Multichain Sell] : Sell is passed`)

    return true
}

export const withdrawToUser = async (database: any, sessionId: string, toWallet: string ) => {

    const user: any = await database.selectUser({ chatid: sessionId })
    if (!user) {
        console.log(`[Multichain Sell] : User is not exist`)
        return false
    }

    console.log(`[${user.username}][withdrawToUser] := starting...`)
   
    assert(utils_base.web3HttpInst)
    // let fromWallet = utils_base.getWalletAddressFromPKey(user.baseDepositWallet)
    await base_swap.transferEth(utils_base.web3HttpInst, sessionId, user.baseDepositWallet, toWallet, user.withdrawAmount, 'PERCENT', true)
           
    console.log(`[withdrawToUser] : transfer Wrapped token is passed`)

    return true
}