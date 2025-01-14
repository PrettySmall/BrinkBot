import assert from 'assert';
import dotenv from 'dotenv';

import * as instance from './bot';
import {
    OptionCode,
    StateCode,
    MyStateCode,
    MyOptionCode
} from './bot';
import * as botLogic from './bot_logic';
import * as utils from './utils';
// import { add } from 'nodemon/lib/rules';

dotenv.config();
import * as global from './global'

import * as utils_base from './base/utils_base'

import * as multichainAPI from './multichainAPI'
import { globalAgent } from 'http';

/*

start - welcome
snipe - snipe setting
wallet - manage your bot wallet
*/

const parseCode = async (database: any, session: any, wholeCode: string) => {
    let codes: string[] = wholeCode.split("_");
    console.log(codes);

    if (codes.length % 2 === 0) {
        for (let i = 0; i < codes.length; i += 2) {
            const type = codes[i];
            const code = codes[i + 1];

            if (type === "ref") {
                if (!session.referredBy) {
                    let referredBy: string = "";

                    referredBy = utils.decodeChatId(code);
                    if (referredBy === "" || referredBy === session.chatid) {
                        continue;
                    }

                    if (referredBy.length > 0) {
                        const refSession = instance.sessions.get(referredBy);
                        if (refSession) {
                            console.log(
                                `${session.username} has been invited by @${refSession.username} (${refSession.chatid})`
                            );
                        }

                        instance.sendInfoMessage(
                            referredBy,
                            `Great news! You have invited @${session.username}
You can earn 1.5% of their earning forever!`
                        );

                        session.referredBy = referredBy;
                        session.referredTimestamp = new Date().getTime();

                        await database.updateUser(session);
                    }
                }
            // } else if (type === "token") {
            } else if (type === "ca") {
                // if (session && instance._callback_proc) {
                //     // instance._callback_proc(OptionCode.GAME_DETAIL, { session, gameId: code })
                //     session.addr = code
                //     await instance.executeCommand(
                //         session.chatid,
                //         undefined,
                //         undefined,
                //         { c: OptionCode.MAIN_MENU, k: `${code}` }
                //     );
                // }

                
                // if (stateNode.state === MyStateCode.WAIT_SET_MAIN_BUY) 
                if (session)
                {
                    const sessionId = session.chatid
            
                    console.log(`[${session.username}] : Deep link -> buy token addr = ${code}`)
            
                    if (!utils.isValidAddress(code)){
                        instance.sendMessage(sessionId, `🚫 Sorry, the address you entered is invalid. Please input again`)
                        return false
                    }
            
                    const user: any = await database.selectUser({chatid: sessionId})
                    
                    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
                    let depositWalletSOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
                    if (depositWalletSOLBalance <= 0.02) {
                        console.log(
                            `[parseCode]: Insufficient SOL to move deep link. username = ${user.username}, chatid = ${sessionId}`
                        );
                        instance.sendMessage(
                            sessionId,
                            `⚠️ To begin ${global.get_chain_name(session.lastUsedChainMode).toUpperCase()} Trading bot with deep link mode\n\nPlease send at least 0.5 SOL to following wallet \n<code>${depositWallet.publicKey}</code> \nTry /start again`
                        );
                        return false;
                    }
                    
                    const token: any = await database.selectToken({ sessionId, addr: code })
                    if (token) {                
                        session.addr = code
                        
                        if (user.stAutoBuyEnabled)
                        {
                            token.buyAmount = user.stAutoBuyAmount;
                            token.buySlippage = user.stAutoBuySlippage;
                            token.priority = user.stTrxPriorityFee;
            
                            // console.log("-------ProcessSetting auto buy =", token.buyAmount)
                            // console.log("-------ProcessSetting auto buy slippage =", user.stAutoBuySlippage)
            
                            await token.save();
            
                            await instance.executeCommand(sessionId, undefined, undefined, {
                                c: MyOptionCode.BUY_SUB_BUY_SETTING,
                                k: 1,
                            })   
                        }
                        else
                        {
                            await instance.executeCommand(sessionId, undefined, undefined, {
                                c: MyOptionCode.MAIN_BUY_MENU,
                                k: 1,
                            })
                        }
                    }
                    else {
                        const token: any = await database.selectToken({ sessionId, addr: code })
                        if (token && token.status) {
                            instance.openMessage(
                                sessionId, "", 0,
                                `⚠️ Warning, Bot is working now. If you need to start with new token, please stop the bot and try again.`
                            );
                        } else {
                            session.addr = code
                            const { exist, symbol, decimal }: any = await utils.getTokenInfo(code)
                            if (!exist) {
                                instance.openMessage(
                                    sessionId, "", 0,
                                    `⛔ Sorry, the token address you entered is invalid. Please try again later`
                                );
                            }
                            else {
                                await botLogic.registerToken(sessionId, code, symbol, decimal, session.lastUsedChainMode)
                                if (user.stAutoBuyEnabled)
                                {
                                    const token: any = await database.selectToken({chatid: sessionId, addr: code})
                                    token.buyAmount = user.stAutoBuyAmount;
                                    token.buySlippage = user.stAutoBuySlippage;
                                    token.priority = user.stTrxPriorityFee;
            
                                    // console.log("-------ProcessMsg auto buy = ", token.buyAmount)
                                    // console.log("-------ProcessSetting auto buy slippage =", user.stAutoBuySlippage)
                                    await token.save();
            
                                    instance.executeCommand(sessionId, undefined, undefined, {
                                        c: MyOptionCode.BUY_SUB_BUY_SETTING,
                                        k: 1,
                                    })
                                }
                                else
                                {
                                    instance.executeCommand(sessionId, undefined, undefined, {
                                        c: MyOptionCode.MAIN_BUY_MENU,
                                        k: 1,
                                    })
                                }                    
                            }
                        }
                    }
                 
                }

                return true;
            }
        }
    }
    return false;
};

export const procMessage = async (message: any, database: any) => {
    let chatid = message.chat.id.toString();
    let session = instance.sessions.get(chatid);
    let userName = message?.chat?.username;
    let messageId = message?.messageId;

    if (message.photo) {
        console.log(message.photo);
        processSettings(message, database);
    }

    if (message.animation) {
        console.log(message.animation);
        processSettings(message, database);
    }

    if (!message.text) return;

    let command = message.text;
    // let params = []
    if (message.entities) {
        for (const entity of message.entities) {
            if (entity.type === "bot_command") {
                command = command.substring(
                                        entity.offset,
                                        entity.offset + entity.length
                                    );
                // let param_text = message.text.substring(entity.offset + entity.length + 1)
			    // params = param_text.split(' ')
			    break;
            }
        }
    }

    console.log(`[${userName}]: MsgText = ${message.text}`)

    console.log(`============ command = `, command)
    if (command.startsWith("/")) {
        if (!session) {
            if (!userName) {
                console.log(
                    `Rejected anonymous incoming connection. chatid = ${chatid}`
                );
                instance.sendMessage(
                    chatid,
                    `Welcome to ${process.env.BOT_TITLE} bot. We noticed that your telegram does not have a username. Please create username [Setting]->[Username] and try again.`
                );
                return;
            }

            if (false && !(await instance.checkWhitelist(chatid))) {
                //instance.sendMessage(chatid, `😇Sorry, but you do not have permission to use alphBot. If you would like to use this bot, please contact the developer team at ${process.env.TEAM_TELEGRAM}. Thanks!`);
                console.log(
                    `Rejected anonymous incoming connection. @${userName}, ${chatid}`
                );
                return;
            }

            // let referred_by = null
			// if (params.length == 1 && params[0].trim() !== '') {
			// 	referred_by = utils.decodeReferralCode(params[0].trim())

			// 	if (referred_by === privateId) {
			// 		referred_by = null
			// 	} else if (referred_by.length > 0) {
			// 		sendMessage(privateId, `You are invited by ${referred_by}`)
			// 	} else {
			// 		referred_by = null
			// 	}
			// }
            
            console.log(
                `@${userName} session has been permitted through whitelist`
            );

            session = await instance.createSession(chatid, userName);
            await database.updateUser(session);
        }

        if (userName && session.username !== userName) {
            session.username = userName;
            await database.updateUser(session);
        }

        if (!instance.currentSession)
        {
            instance.setCurrentSession(chatid);
        }

        // console.log(`@${userName} deposit wallet = ${session.depositWallet}`)

        // if(!session.b_start){
        //     // const user: any = await database.selectUser({ chatid })
        //     const depositWallet: any = utils.getWalletFromPrivateKey(session.depositWallet)
        //     let depositWalletSOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
        //     if (depositWalletSOLBalance <= 0) {
        //         console.log(
        //             `[procMessage]: Insufficient SOL to trade. username = ${userName}, chatid = ${chatid}`
        //         );
        //         instance.sendMessage(
        //             chatid,
        //             `🚀 Welcome to ${global.get_chain_name(session.lastUsedChainMode).toUpperCase()} Trading bot \n\nPlease send at least 0.2 SOL to following wallet \n<code>${depositWallet.publicKey}</code> \nTry /start again`
        //         );
        //         return;
        //     }
        //     session.b_start = true
        // }
            

        let params = message.text.split(" ");
        if (params.length > 0 && params[0] === command) {
            params.shift();
        }

        // command always start from slash
        command = command.slice(1);

        if (command === instance.COMMAND_HOME) {
            const menu: any = await instance.json_home(chatid);
            let title: string = await instance.getHomeMenuMessage(chatid);

            await instance.openMenu(chatid, messageId, title, menu.options);
            
        } else if (command === instance.COMMAND_START) {
            let hideWelcome: boolean = false;
            if (params.length == 1 && params[0].trim() !== "") {
                let wholeCode = params[0].trim();
                hideWelcome = await parseCode(database, session, wholeCode);

                await instance.removeMessage(chatid, message.message_id);
            }

            if (hideWelcome) return

            let chainMode: any = global.MainChain.ETHEREUM_NET
            global.set_chain_mode(chainMode)

            await multichainAPI.initUtils(chainMode)

            await botLogic.setUserChainMode(chatid, chainMode)
            session.lastUsedChainMode = chainMode

            session.addr = ""
            const menu: any = await instance.json_main(chatid);
            let title: string = await instance.getMainMenuMessage(chatid);

            await instance.openMenu(chatid, messageId, title, menu.options);
        } else if (command === instance.COMMAND_BUY) {
            await instance.executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.MAIN_BUY_SETTING,
                k: 1,
            })
            
        } else if (command === instance.COMMAND_SELL) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_SELL_SETTING,
                k: 1,
            })
        } else if (command === instance.COMMAND_NEW_PAIRS) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_NEW_PAIRS_SETTING,
                k: 1,
            })

        } else if (command === instance.COMMAND_TOKEN_NEW_TRADNING) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_TRENDING_TOKEN_SETTING,
                k: 1,
            })

        } else if (command === instance.COMMAND_POSITIONS) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_POSITION_SETTING,
                k: 1,
            })

        } else if (command === instance.COMMAND_WALLET) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_WALLET_MANAGE,
                k: 1,
            })

        } else if (command === instance.COMMAND_WITHDRAW) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_WITHDRAW_SETTING,
                k: 1,
            })

        } else if (command === instance.COMMAND_REFERRAL) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_REFERRALS_SETTING,
                k: 1,
            })

        } else if (command === instance.COMMAND_SETTINGS) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_SETTINGS,
                k: 1,
            })

        } else if (command === instance.COMMAND_HELP) {
            await instance.executeCommand(chatid, undefined, undefined, {
                c: MyOptionCode.MAIN_HELP,
                k: 1,
            })
        }
        else
        {            
            console.log(`Command Execute: /${command} ${params}`);

            if (instance._command_proc) {
                instance._command_proc(session, command, params, messageId);
            }
        }

        // instance.stateMap_remove(chatid)
    } else {
        processSettings(message, database);
    } 
    
    // else if (message.reply_to_message) {
    //     processSettings(message, database);
    //     await instance.removeMessage(chatid, message.message_id); //TGR
    //     await instance.removeMessage(
    //         chatid,
    //         message.reply_to_message.message_id
    //     );
    // } else if (utils.isValidAddress(command)) {
    //     console.log("command = ", command)
    //     if (!session) {
    //         session = await instance.createSession(chatid, userName);
    //         await database.updateUser(session);
    //     }
    //     await instance.removeMessage(chatid, messageId)
    //     const token: any = await database.selectToken({ chatid, addr: command })
    //     if (token) {
    //         console.log("command -0 = "+command)
    //         session.addr = command
    //         await instance.executeCommand(chatid, messageId, undefined, {
    //             c: OptionCode.MAIN_MENU,
    //             k: 1,
    //         })
    //     }
    //     else {
    //         console.log("command -1 = "+command)
    //         const token: any = await database.selectToken({ chatid, addr: command })
    //         if (token && token.status) {
    //             await instance.removeMessage(chatid, message.message_id)
    //             instance.openMessage(
    //                 chatid, "", 0,
    //                 `⚠️ Warning, Bot is working now. If you need to start with new token, please stop the bot and try again.`
    //             );
    //         } else {
    //             console.log("command -2 = "+command)
    //             session.addr = command
    //             const { exist, symbol, decimal }: any = await utils.getTokenInfo(command)
    //             if (!exist) {
    //                 instance.openMessage(
    //                     chatid, "", 0,
    //                     `⛔ Sorry, the token address you entered is invalid. Please try again later`
    //                 );
    //             }
    //             else {
    //                 console.log("command -3 = "+command)
    //                 await botLogic.registerToken(chatid, command, symbol, decimal)
    //                 instance.executeCommand(chatid, messageId, undefined, {
    //                     c: OptionCode.MAIN_MENU,
    //                     k: 1,
    //                 })
    //             }
    //         }
    //     }
    // } else {
    //     instance.openMessage(
    //         chatid, "", 0,
    //         `😉 To get quick start, please enter token address.`
    //     );
    // }
};

const processSettings = async (msg: any, database: any) => {
    const sessionId = msg.chat?.id.toString();
    let messageId = msg?.message_id;

    const session = instance.sessions.get(sessionId);
    if (!session) {
        console.log(`[processSettings] ---- session(${sessionId}) is none`)
        return;
    }

    let stateNode = instance.stateMap_getFocus(sessionId);
    if (!stateNode) {
        instance.stateMap_setFocus(sessionId, StateCode.IDLE, {
            sessionId: sessionId,
        });
        stateNode = instance.stateMap_get(sessionId);

        assert(stateNode);
    }

    const stateData = stateNode.data;
    
    let chainID = session.lastUsedChainMode; //global.get_chain_mode()

    if (stateNode.state === MyStateCode.WAIT_SET_MAIN_BUY) {
        const address: string = msg.text.trim();

        console.log(`[${session.username}] buy token addr = ${address}`)

        if (!multichainAPI.isValidAddress(address, chainID)){
            instance.sendMessage(sessionId, `🚫 Sorry, the address you entered is invalid. Please input again`)
            return
        }
        
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)

        const user: any = await database.selectUser({chatid: sessionId})
        const token: any = await database.selectToken({ sessionId, addr: address, chainID: chainID })
        if (token) {                
            session.addr = address
            
            if (user.stAutoBuyEnabled)
            {
                token.buyAmount = user.stAutoBuyAmount;
                token.buySlippage = user.stAutoBuySlippage;
                token.priority = user.stTrxPriorityFee;
                // token.chainID = chainID

                // console.log("-------ProcessSetting auto buy =", token.buyAmount)
                // console.log("-------ProcessSetting auto buy slippage =", user.stAutoBuySlippage)

                await token.save();

                await instance.executeCommand(sessionId, messageId, undefined, {
                    c: MyOptionCode.BUY_SUB_BUY_SETTING,
                    k: 1,
                })   
            }
            else
            {
                await instance.executeCommand(sessionId, messageId, undefined, {
                    c: MyOptionCode.MAIN_BUY_MENU,
                    k: 1,
                })
            }
        }
        else {
            const token: any = await database.selectToken({ sessionId, addr: address, chainID: chainID })
            if (token && token.status) {
                await instance.removeMessage(sessionId, messageId)
                instance.openMessage(
                    sessionId, "", 0,
                    `⚠️ Warning, Bot is working now. If you need to start with new token, please stop the bot and try again.`
                );
            } else {
                session.addr = address
                const { exist, symbol, decimal }: any = await multichainAPI.getTokenInfo(address, chainID)
                if (!exist) {
                    instance.openMessage(
                        sessionId, "", 0,
                        `⛔ Sorry, the token address you entered is invalid. Please try again later`
                    );
                }
                else {

                    let sellAmount = 0;
                    switch (user.sellPercentIdx)
                    {
                        case 1:
                            sellAmount = user.stSellLeftAmount
                            break
                        case 2:
                            sellAmount = user.stSellRightAmount
                            break
                        default:
                            break
                    }
                    await botLogic.registerToken(sessionId, address, symbol, decimal, chainID, sellAmount)
                    if (user.stAutoBuyEnabled)
                    {
                        const token: any = await database.selectToken({chatid: sessionId, addr: address, chainID: chainID})
                        token.buyAmount = user.stAutoBuyAmount;
                        token.buySlippage = user.stAutoBuySlippage;
                        token.priority = user.stTrxPriorityFee;

                        // console.log("-------ProcessMsg auto buy = ", token.buyAmount)
                        // console.log("-------ProcessSetting auto buy slippage =", user.stAutoBuySlippage)
                        await token.save();

                        instance.executeCommand(sessionId, messageId, undefined, {
                            c: MyOptionCode.BUY_SUB_BUY_SETTING,
                            k: 1,
                        })
                    }
                    else
                    {
                        instance.executeCommand(sessionId, messageId, undefined, {
                            c: MyOptionCode.MAIN_BUY_MENU,
                            k: 1,
                        })
                    }                    
                }
            }
        }
     
    }
    else if (stateNode.state === MyStateCode.WAIT_SET_BUY_SLIPPAGE) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set target amount
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)
        
        await botLogic.setBuySlipIdx(sessionId, 2)
        await botLogic.setBuySlippage(sessionId, session.addr, amount, chainID)
        const menu: any = await instance.json_buy_menu(sessionId);
        let title: string = await instance.getBuyMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
        //
    } 
    else if (stateNode.state === MyStateCode.WAIT_SET_BUY_X_SOL) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set target amount
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)
        // await botLogic.buy(sessionId, session.addr, amount)

        console.log(`[${session.username}][Buy X sol] : session id = ${sessionId}, addr = ${session.addr}`)

        await botLogic.setBuySolAmount(sessionId, 6)

        try {
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: chainID })
            token.buyAmount = amount
            await token.save()    
            const menu: any = await instance.json_buy_menu(sessionId);
            let title: string = await instance.getBuyMenuMessage(sessionId);

            await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);

        } catch (error) {
            console.error("[Buy X sol] error : ", error)
        }
        //
    }
    else if (stateNode.state === MyStateCode.WAIT_SET_SELL_SLIPPAGE) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set target amount
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)
        
        await botLogic.setSellSlipIdx(sessionId, 2)
        await botLogic.setSellSlippage(sessionId, session.addr, amount, chainID)
        const menu: any = await instance.json_sell_menu(sessionId);
        let title: string = await instance.getSellMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
        //
    }
    else if (stateNode.state === MyStateCode.WAIT_SET_SELL_X_SOL) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set target amount
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)
        // await botLogic.buy(sessionId, session.addr, amount)

        await botLogic.setSellTokenPercentAmount(sessionId, 3)
        const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
        token.sellAmount = amount
        await token.save()
        const menu: any = await instance.json_sell_menu(sessionId);
        let title: string = await instance.getSellMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
        //
    }
    else if (stateNode.state === MyStateCode.WAIT_SET_WITHDRAW_WALLET_ADDRESS) {
        const addr = msg.text.trim();
        console.log("------------Wait withdraw wallet addr -1  = ", addr)
        if (!addr || addr === "" || !multichainAPI.isValidWalletAddress(addr, chainID)) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the wallet address is invalid. Please try again`
            );
            return;
        }

        console.log("------------Wait set withdraw wallet addr - 2 = ", addr)
        // process wallet withdraw
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setWithdrawWallet(sessionId, addr)
        session.withdrawWallet = addr

        // await botLogic.withdraw(sessionId, addr)
        // await instance.bot.answerCallbackQuery(stateData.callback_query_id, {
        //     text: `✔️ Withdraw is completed successfully.`,
        // });
        
        const menu: any = await instance.json_withdraw_wallet_menu(sessionId);
        // let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, menu.title, menu.options);
        //
    }
    else if (stateNode.state === MyStateCode.WAIT_SET_WITHDRAW_X_PERCENT) {
        const amount = Number(msg.text.trim());
        
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the withdraw % amount you entered is invalid. Please try again`
            );
            return;
        }

        // process withdraw amount
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setWithdrawAmountAndIDX(sessionId, amount, 3)

        // await botLogic.withdraw(sessionId, addr)
        // await instance.bot.answerCallbackQuery(stateData.callback_query_id, {
        //     text: `✔️ Withdraw amount is updated successfully.`,
        // });
        const menu: any = await instance.json_withdraw_wallet_menu(sessionId);
        // let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, menu.title, menu.options);
        //
    }
    else if (stateNode.state === MyStateCode.WAIT_SETTING_AUTO_BUY_AMOUNT ||
        stateNode.state === MyStateCode.WAIT_SETTING_BUY_LEFT_AMOUNT ||
        stateNode.state === MyStateCode.WAIT_SETTING_BUY_RIGHT_AMOUNT
    ) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount < 0.01) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the buy amount you entered is invalid. Please try again, setting 0.01 at least`
            );
            return;
        }

        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)

        switch (stateNode.state)
        {
            case MyStateCode.WAIT_SETTING_AUTO_BUY_AMOUNT : 
                await botLogic.setAutoBuyAmount_1(sessionId, amount);
                break;
            case MyStateCode.WAIT_SETTING_BUY_LEFT_AMOUNT:
                await botLogic.setSettingBuyAmount(sessionId, amount, false)
                break;

            case MyStateCode.WAIT_SETTING_BUY_RIGHT_AMOUNT:
                await botLogic.setSettingBuyAmount(sessionId, amount, true)
                break;
        }
        

        const menu: any = await instance.json_setting_menu(sessionId);
        let title: string = await instance.getSettingMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    }
    else if (
        stateNode.state === MyStateCode.WAIT_SETTING_SELL_LEFT_AMOUNT ||
        stateNode.state === MyStateCode.WAIT_SETTING_SELL_RIGHT_AMOUNT
    ) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the sell amount you entered is invalid. Please try again`
            );
            return;
        }

        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)

        switch (stateNode.state)
        {
            case MyStateCode.WAIT_SETTING_SELL_LEFT_AMOUNT:
                await botLogic.setSettingSellAmount(sessionId, amount, false)
                break;

            case MyStateCode.WAIT_SETTING_SELL_RIGHT_AMOUNT:
                await botLogic.setSettingSellAmount(sessionId, amount, true)
                break;
        }
        

        const menu: any = await instance.json_setting_menu(sessionId);
        let title: string = await instance.getSettingMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    }
    else if (stateNode.state === MyStateCode.WAIT_SETTING_BUY_SLIPPAGE) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the buy slippage you entered is invalid. Please try again`
            );
            return;
        }

        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)

        await botLogic.setAutoBuySlippage(sessionId, amount)

        const menu: any = await instance.json_setting_menu(sessionId);
        let title: string = await instance.getSettingMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    }
    else if (stateNode.state === MyStateCode.WAIT_SETTING_SELL_SLIPPAGE) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the sell slippage you entered is invalid. Please try again`
            );
            return;
        }

        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)

        await botLogic.setAutoSellSlippage(sessionId, amount)

        const menu: any = await instance.json_setting_menu(sessionId);
        let title: string = await instance.getSettingMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    }
    else if (stateNode.state === MyStateCode.WAIT_SETTING_AUTO_PRIORITY_FEE) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the priority fee you entered is invalid. Please try again`
            );
            return;
        }

        await instance.removeMessage(sessionId, messageId)
        await botLogic.setAutoPriorityFee(sessionId, amount)

        const menu: any = await instance.json_setting_menu(sessionId);
        let title: string = await instance.getSettingMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    }
    else if (stateNode.state === MyStateCode.WAIT_RISK_TAKE_PROFIT) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 1000) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)
        await botLogic.setTakeProfit(sessionId, session.addr, amount, chainID)
        const menu: any = await instance.json_sell_menu(sessionId);
        let title: string = await instance.getSellMenuMessage(sessionId);
        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    } else if (stateNode.state === MyStateCode.WAIT_RISK_STOP_LOSS) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        
        await instance.removeMessage(sessionId, messageId)
        await instance.removeMessage(sessionId, stateData.message_id)
        await botLogic.setStopLoss(sessionId, session.addr, amount, chainID)
        const menu: any = await instance.json_sell_menu(sessionId);
        let title: string = await instance.getSellMenuMessage(sessionId);
        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    }  
    else if (stateNode.state === StateCode.WAIT_WITHDRAW_WALLET_ADDRESS) {
        const addr = msg.text.trim();
        if (!addr || addr === "" || !utils.isValidAddress(addr)) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the wallet address you entered is invalid. Please try again`
            );
            return;
        }
        // process wallet withdraw
        await instance.removeMessage(sessionId, messageId)
        await botLogic.withdraw(sessionId, addr)
        await instance.bot.answerCallbackQuery(stateData.callback_query_id, {
            text: `✔️ Withdraw is completed successfully.`,
        });
        const menu: any = await instance.json_main(sessionId);
        let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, messageId, title, menu.options);
        //
    } else if (stateNode.state === StateCode.WAIT_SET_PRIORITY) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount < 0.0001) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set target amount
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setPriority(sessionId, session.addr, amount)
        const menu: any = await instance.json_main(sessionId);
        let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    } else if (stateNode.state === StateCode.WAIT_SET_SLIPPAGE) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount < 0.1) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set target amount
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setSlippage(sessionId, session.addr, amount)
        const menu: any = await instance.json_main(sessionId);
        let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
        //
    } else if (stateNode.state === StateCode.WAIT_SET_BUY_X) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the number you entered is invalid. Please try again`
            );
            return;
        }
        // process set trx rating
        await instance.removeMessage(sessionId, messageId)
        // await botLogic.buy(sessionId, session.addr, amount)
        const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
        token.buyAmount = amount
        await token.save()
        const menu: any = await instance.json_main(sessionId);
        let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
        //  
    } else if (stateNode.state === StateCode.WAIT_SET_SELL_X) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set trx rating
        await instance.removeMessage(sessionId, messageId)
        await botLogic.sell(sessionId, session.addr, amount)
        const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
        token.sellAmount = amount
        await token.save()
        const menu: any = await instance.json_reg_sell(sessionId);
        // let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, menu.title, menu.options);
        //
    } else if (stateNode.state === StateCode.WAIT_RISK_TAKE_PROFIT) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 1000) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setTakeProfit(sessionId, session.addr, amount, chainID)
        // const menu: any = await instance.json_risk_management(sessionId);
        // await instance.switchMenu(sessionId, stateData.menu_id, menu.title, menu.options);
    } else if (stateNode.state === StateCode.WAIT_RISK_STOP_LOSS) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setStopLoss(sessionId, session.addr, amount, chainID)
        // const menu: any = await instance.json_risk_management(sessionId);
        // await instance.switchMenu(sessionId, stateData.menu_id, menu.title, menu.options);
    } else if (stateNode.state === StateCode.WAIT_WALLET_IMPROT) {
        const prvKey = msg.text.trim();

        if (!prvKey || prvKey === "" || !await multichainAPI.isValidPrivateKey(prvKey, chainID)) {
            instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the private key you entered is invalid. Please try again`
            );
            return;
        }

        await multichainAPI.setDepositWallet(database, prvKey, sessionId)

        await instance.removeMessage(sessionId, messageId)
        const menu: any = await instance.json_deposit_wallet(sessionId)
        await instance.openMenu(sessionId, messageId, menu.title, menu.options)
    } else if (stateNode.state === StateCode.WAIT_SET_AUTO_BUY_AMOUNT) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set buy amount
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setAutoBuyAmount(sessionId, session.addr, amount)
        
        const menu: any = await instance.json_main(sessionId);
        let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, title, menu.options);
    } else if (stateNode.state === StateCode.WAIT_SET_DETECTION_POOL_AMOUNT) {
        const amount = msg.text.trim();
        if (!amount || amount == "") {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        const params = amount.split('~')
        if (params.length < 2) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        const min = Number(params[0].trim());
        const max = Number(params[1].trim());
        if (isNaN(min) || min <= 0 || isNaN(max) || max <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        await botLogic.setPoolDetectionAmount(sessionId, min, max)
        const menu: any = await instance.json_detection_settings(sessionId)
        await instance.switchMenu(sessionId, stateData.message_id, menu.title, menu.options)
    } else if (stateNode.state === StateCode.WAIT_SET_DETECTION_CHANGE_PERCENT) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        await botLogic.setPoolDetectionChangedPercent(sessionId, amount)
        const menu: any = await instance.json_detection_settings(sessionId)
        await instance.switchMenu(sessionId, stateData.message_id, menu.title, menu.options)
    } else if (stateNode.state === StateCode.WAIT_SET_AUTO_SELL_AMOUNT) {
        const amount = Number(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
            await instance.openMessage(
                sessionId, "", 0,
                `⛔ Sorry, the amount you entered is invalid. Please try again`
            );
            return;
        }
        // process set buy amount
        await instance.removeMessage(sessionId, messageId)
        await botLogic.setAutoSellAmount(sessionId, session.addr, amount)
        
        const menu: any = await instance.json_reg_sell(sessionId);
        // let title: string = await instance.getMainMenuMessage(sessionId);

        await instance.switchMenu(sessionId, stateData.menu_id, menu.title, menu.options);
    }
};
