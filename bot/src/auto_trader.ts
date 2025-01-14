
import * as bot from './bot';
import * as database from './db';

import * as utils from './utils';

import * as multichainAPI from './multichainAPI'
import * as multichainSwap from './multichainSwap'

import * as birdeye from './birdeyeAPI'

import * as utils_base from './base/utils_base'

import * as global from './global'

import dotenv from 'dotenv'
dotenv.config()

const INTERVAL = 1000 * 3

export const autoSwap_Sell_thread = async () => {

    const autoTradeTokens: any = await database.selectTokens({isAutoSell: true})

    for (const token of autoTradeTokens) {
        try {
            const session = bot.sessions.get(token.chatid)

            if (!session || (session.chatid !== bot.currentSession?.chatid) || !session.depositWallet || !token.buyPrice) {
                continue
            }

            // console.log(`======== session token addres :=  ` , token.addr)
            const data = await birdeye.getTokenPriceInfo_Birdeye(token.addr, session.lastUsedChainMode)

            let cur_price: number = 0
            if(data && data.value) cur_price = data.value

            // console.log(`======== token cur price :=`, cur_price)
            if (cur_price === 0) {
                continue
            }            

            const depositWallet = await multichainAPI.getDepositWalletBalance(database, session.chatid)

            const tokenBalance: number = await multichainAPI.getTokenBalanceOfWallet(depositWallet, token.addr, token.decimal, session.lastUsedChainMode)
            
            // console.log(`======== token balance :=`, tokenBalance)

            if (tokenBalance === 0)
            {
                continue
            }

            if (tokenBalance && token.isAutoSell) {
                
                console.log(`[autoSwap_Sell_thread] -> token : buyPrice = ${token.buyPrice}, curPrice = ${cur_price}`)

                const hAmount: number = (100 + token.takeProfit) / 100
                const lAmount: number = (100 - token.stopLoss) / 100
                const TP = token.buyPrice * hAmount
                const SL = token.buyPrice * lAmount
                if (cur_price <= SL || cur_price >= TP) {
                    // sell(user.chatid, addr, user.autoSellAmount)
                    await multichainSwap.sell(token.addr, database, session.chatid, async (param: any) => {
                        console.log(`[${session.username}] [multichainSwap : Auto Sell] : = ${param.text}`)
                        
                        if (param.success)
                        {
                            // const menu: any = await json_sell_menu(chatid);
                            // let title: string = await getSellMenuMessage(chatid);
        
                            // await openMenu(chatid, messageId, title, menu.options);        
                        }
                        else
                        {
                            // let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                            // // const menu: any = await json_sell_success_menu(chatid);
                            // await switchMenu(chatid, messageId, param.text, json);    
                        }
                    })        

                    token.isAutoSell = false
                    await token.save()
                }
            }
           
            await utils.sleep(50);
        } catch (error) {

            console.log('AutoTrader failure', error)
        }
    }

    setTimeout(() => {
        autoSwap_Sell_thread()
    }
        , INTERVAL)
}

export const start = async () => {

    console.log('AutoTrader daemon has been started...')

    setTimeout(() => {
        autoSwap_Sell_thread()
    }, INTERVAL)    
}