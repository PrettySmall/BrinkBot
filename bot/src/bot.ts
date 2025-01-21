import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import * as botLogic from './bot_logic';
import * as privateBot from './bot_private';
import * as database from './db';
import * as dexscreenerAPI from './dexscreenerAPI';
import * as birdeyeAPI from './birdeyeAPI'
import * as afx from './global';
import {
    addUser,
    runDetector,
} from './token_detector';
import * as constants from './uniconst';

import { sol, token } from '@metaplex-foundation/js';
import isEmpty from 'is-empty';
import { NewPairMonitor } from './new_pairs'
import { BaseNewPairMonitor, createChainWebSocket } from './base_new_pairs'
import { BaseTrendingTokenMonitor } from './base_trending_token'

import * as utils from './utils'
import * as utils_base from './base/utils_base'

import * as multichainAPI from './multichainAPI'
import * as multichainSwap from './multichainSwap'
import { Base } from '@raydium-io/raydium-sdk';

dotenv.config();

export const COMMAND_HOME  = "home";
export const COMMAND_START  = "start";
export const COMMAND_BUY    = "buy";
export const COMMAND_SELL   = "sell";
export const COMMAND_NEW_PAIRS   = "newpairs";
export const COMMAND_TOKEN_NEW_TRADNING   = "trending";
export const COMMAND_POSITIONS   = "positions";
export const COMMAND_WALLET   = "wallets";
export const COMMAND_WITHDRAW   = "withdraw";
export const COMMAND_REFERRAL   = "referral";
export const COMMAND_SETTINGS   = "settings";
export const COMMAND_HELP   = "help";


export enum OptionCode {
    BACK = -100,
    CLOSE,
    TITLE,
    WELCOME = 0,
    MAIN_MENU,
    MAIN_HELP,

    MAIN_SWITCH_MODE,

    MAIN_SWITCH_AUTO_DETECT,

    MAIN_SWITCH_AUTO_BUY,
    MAIN_BUY_25,
    MAIN_BUY_50,
    MAIN_BUY_100,
    MAIN_BUY_X,

    MAIN_SETTING_AUTO_BUY_X,
    MAIN_SETTING_AUTO_BUY_1,
    MAIN_SETTING_AUTO_BUY_2,
    MAIN_SETTING_AUTO_BUY_10,

    MAIN_SWITCH_AUTO_SELL,
    MAIN_SELL_25,
    MAIN_SELL_50,
    MAIN_SELL_100,
    MAIN_SELL_X,

    MAIN_SETTING_AUTO_SELL_X,
    MAIN_SETTING_AUTO_SELL_25,
    MAIN_SETTING_AUTO_SELL_50,
    MAIN_SETTING_AUTO_SELL_100,

    MAIN_RISK_MANAGE,
    MAIN_RISK_TAKE_PROFIT,
    MAIN_RISK_STOP_LOSS,

    MAIN_SETTING_DETECTION,
    MAIN_DETECTION_MINTABLE,
    MAIN_DETECTION_LOCKED,
    MAIN_DETECTION_POOL_AMOUNT,
    MAIN_DETECTION_POOL_AMOUNT_CEHCK,
    MAIN_DETECTION_CHANGE_PERCENT,
    MAIN_DETECTION_CHANGE_PERCENT_CHECK,

    MAIN_SET_SLIPPAGE,
    MAIN_WALLET_MANAGE,
    MAIN_REFRESH,

    MAIN_SET_PRIORITY,

    MAIN_TOKEN_TRADE,

    MAIN_WALLET_IMPORT,
    MAIN_WALLET_EXPORT,
    MAIN_WALLET_REFRESH,

    MAIN_LOG_TRADE,

    HELP_BACK,

    MAIN_SETTING_REG_BUY,
    MAIN_SETTING_REG_SELL,

    MAIN_REG_BUY_SETTING,
    MAIN_REG_SELL_SETTING,

    MAIN_REG_BUY_REFRESH,
    MAIN_REG_SELL_REFRESH,

    MAIN_REG_SELL_SWITCH_MODE,

}

export enum StateCode {
    IDLE = 1000,
    WAIT_WITHDRAW_WALLET_ADDRESS,

    WAIT_SET_SLIPPAGE,
    WAIT_SET_PRIORITY,

    WAIT_SET_BUY_X,
    WAIT_SET_SELL_X,

    WAIT_RISK_TAKE_PROFIT,
    WAIT_RISK_STOP_LOSS,
    WAIT_SET_AUTO_BUY_AMOUNT,
    WAIT_SET_AUTO_SELL_AMOUNT,
    WAIT_WALLET_IMPROT,

    WAIT_SET_DETECTION_POOL_AMOUNT,
    WAIT_SET_DETECTION_CHANGE_PERCENT,
}

export enum MyOptionCode {
    TITLE = 8000,
    MAIN_MENU = 9000,
    MAIN_BACK,    
    MAIN_BUY_MENU,
    MAIN_SELL_MENU,

    MAIN_CHAIN_SOLANA,
    MAIN_CHAIN_ETHEREUM,
    MAIN_CHAIN_BASE,
    MAIN_CHAIN_BSC,
    MAIN_CHAIN_TON,
    MAIN_CHAIN_TRON,
    MAIN_CHAIN_POLYGON,

    MAIN_BUY_SETTING = 10000,
    MAIN_SELL_SETTING,
    MAIN_POSITION_SETTING,
    MAIN_LIMIT_ORDERS_SETTING,
    MAIN_LP_SNIPERS_SETTING,
    MAIN_NEW_PAIRS_SETTING,
    MAIN_TRENDING_TOKEN_SETTING,
    MAIN_REFERRALS_SETTING,
    MAIN_SETTINGS,
    MAIN_HELP,
    MAIN_WITHDRAW_SETTING,
    MAIN_REFRESH,
    MAIN_WALLET_MANAGE,
    MAIN_WALLET_IMPORT,

    HELP_BACK,
    CLOSE,

    BUY_SUB_SWAP_SETTING = 12000,
    BUY_SUB_LIMIT_SETTING,
    BUY_SUB_05_SETTING,
    BUY_SUB_1_SETTING,
    BUY_SUB_3_SETTING,
    BUY_SUB_5_SETTING,
    BUY_SUB_10_SETTING,
    BUY_SUB_X_SETTING,
    BUY_SUB_15_SLIPPAGE_SETTING,
    BUY_SUB_X_SLIPPAGE_SETTING,
    BUY_SUB_BUY_SETTING,
    BUY_SUB_BACK_SETTING,
    BUY_SUB_REFRESH,
    BUY_SUB_LIMIT_PRICE_SETTING,
    BUY_SUB_LIMIT_EXPIRY_SETTING,
    BUY_SUB_LIMIT_CREATE_ORDER_SETTING,

    BUY_SUCCESS_VIEW_TOKENS,
    BUY_SUCCESS_SELL,

    SELL_SUB_SWAP_SETTING,
    SELL_SUB_LIMIT_SETTING,
    SELL_SUB_50_SETTING,
    SELL_SUB_100_SETTING,
    SELL_SUB_X_SETTING,
    SELL_SUB_15_SLIPPAGE_SETTING,
    SELL_SUB_X_SLIPPAGE_SETTING,
    SELL_SUB_SELL_SETTING,
    SELL_SUB_BACK_SETTING,
    SELL_SUB_REFRESH,
    SELL_SUB_LIMIT_PRICE_SETTING,
    SELL_SUB_LIMIT_EXPIRY_SETTING,
    SELL_SUB_LIMIT_CREATE_ORDER_SETTING,
    
    SELL_AUTO_MANUAL_SWITCH_MODE,
    SELL_AUTO_CREATE_ORDER,
    SELL_AUTO_TAKE_PROFIT,
    SELL_AUTO_STOP_LOSS,

    SELL_TOKEN_BACK_SETTING,
    SELL_TOKEN_REFRESH,

    POSITION_BUY_05_SETTING,
    POSITION_BUY_1_SETTING,
    POSITION_BUY_X_SETTING,

    POSITION_SELL_50_SETTING,
    POSITION_SELL_100_SETTING,
    POSITION_SELL_X_SETTING,

    POSITION_SELECT_TOKEN,
    POSITION_SORT_SETTING,
    POSITION_SUB_BACK,
    POSITION_SUB_REFRESH,

    SUB_NEW_PAIRS_SETTING,
    SUB_UPCOMING_LAUNCHES_SETTING,
    SUB_NEW_PAIRS_REFRESH,

    SUB_TRENDING_TOKEN_SETTING,
    SUB_TRENDING_TOKEN_REFRESH,

    WITHDRAW_SOLANA_MODE,
    WITHDRAW_ETHEREUM_MODE,
    WITHDRAW_BASE_MODE,
    WITHDRAW_BSC_MODE,
    WITHDRAW_TON_MODE,
    WITHDRAW_BACK,

    WITHDRAW_TOKEN_NET_MODE,
    WITHDRAW_TOKEN_BACK,
    WITHDRAW_TOKEN_REFRESH,

    WITHDRAW_50_PERCENT,
    WITHDRAW_100_PERCENT,
    WITHDRAW_X_PERCENT,
    WITHDRAW_X_SOL,
    WITHDRAW_WALLET_ADDRESS,
    WITHDRAW_WALLET_BACK,
    WITHDRAW_WALLET_REFRESH,
    WITHDRAW_WALLET_TO,
    WITHDRAW_OK,

    REFERRAL_SUB_REWARD_WALLET,

    SETTING_AUTO_BUY_ENABLED,
    SETTING_AUTO_BUY_SOL,
    SETTING_BUY_LEFT_BUTTON,
    SETTING_BUY_RIGHT_BUTTON,
    SETTING_SELL_LEFT_BUTTON,
    SETTING_SELL_RIGHT_BUTTON,
    SETTING_BUY_SLIPPAGE,
    SETTING_SELL_SLIPPAGE,
    SETTING_MEV_PROTECT,
    SETTING_TRX_PRIORITY,
    SETTING_TRX_PRIORITY_FEE,

}

export enum MyStateCode {
    IDLE = 20000,
    WAIT_SET_MAIN_BUY,
    WAIT_SET_MAIN_SELL,

    WAIT_SET_BUY_SLIPPAGE,
    WAIT_SET_BUY_X_SOL,

    WAIT_SET_SELL_SLIPPAGE,
    WAIT_SET_SELL_X_SOL,

    WAIT_RISK_TAKE_PROFIT,
    WAIT_RISK_STOP_LOSS,

    WAIT_SET_WITHDRAW_WALLET_ADDRESS,
    WAIT_SET_WITHDRAW_X_PERCENT,

    WAIT_SETTING_AUTO_BUY_AMOUNT,
    WAIT_SETTING_BUY_LEFT_AMOUNT,
    WAIT_SETTING_BUY_RIGHT_AMOUNT,
    WAIT_SETTING_SELL_LEFT_AMOUNT,
    WAIT_SETTING_SELL_RIGHT_AMOUNT,

    WAIT_SETTING_BUY_SLIPPAGE,
    WAIT_SETTING_SELL_SLIPPAGE,
    WAIT_SETTING_AUTO_PRIORITY_FEE,

}

export let bot: TelegramBot;
export let myInfo: TelegramBot.User;
export const sessions = new Map();
export const stateMap = new Map();
export const informMap = new Map();

export let currentSession: any = null;

export const setCurrentSession = (chatid:number) => {
    currentSession = sessions.get(chatid)
}

export const addInform = (messageId: number, chatid: string, addr: string) => {
    const data: any = {}
    data.chatid = chatid
    data.addr = addr
    informMap.set(messageId, data)
}


export const deleteInform = (messageId: number) => {
    informMap.delete(messageId)
}
export const stateMap_setFocus = (
    chatid: string,
    state: any,
    data: any = {}
) => {
    let item = stateMap.get(chatid);
    if (!item) {
        item = stateMap_init(chatid);
    }

    if (!data) {
        let focusData = {};
        if (item.focus && item.focus.data) {
            focusData = item.focus.data;
        }

        item.focus = { state, data: focusData };
    } else {
        item.focus = { state, data };
    }

    // stateMap.set(chatid, item)
};

export const stateMap_getFocus = (chatid: string) => {
    const item = stateMap.get(chatid);
    if (item) {
        let focusItem = item.focus;
        return focusItem;
    }

    return null;
};

export const stateMap_init = (chatid: string) => {
    let item = {
        focus: { state: StateCode.IDLE, data: { sessionId: chatid } },
        message: new Map(),
    };

    stateMap.set(chatid, item);

    return item;
};

export const stateMap_setMessage_Id = (
    chatid: string,
    messageType: number,
    messageId: number
) => {
    let item = stateMap.get(chatid);
    if (!item) {
        item = stateMap_init(chatid);
    }

    item.message.set(`t${messageType}`, messageId);
    //stateMap.set(chatid, item)
};

export const stateMap_getMessage = (chatid: string) => {
    const item = stateMap.get(chatid);
    if (item) {
        let messageItem = item.message;
        return messageItem;
    }

    return null;
};

export const stateMap_getMessage_Id = (chatid: string, messageType: number) => {
    const messageItem = stateMap_getMessage(chatid);
    if (messageItem) {
        return messageItem.get(`t${messageType}`);
    }

    return null;
};

export const stateMap_get = (chatid: string) => {
    return stateMap.get(chatid);
};

export const stateMap_remove = (chatid: string) => {
    stateMap.delete(chatid);
};

export const stateMap_clear = () => {
    stateMap.clear();
};

export const json_buttonItem = (key: string, cmd: number, text: string) => {
    return {
        text: text,
        callback_data: JSON.stringify({ k: key, c: cmd }),
    };
};

export const json_buttonTokenItem = (key: string, cmd: number, text: string, tokenSymbol: string) => {
    return {
        text: text,
        callback_data: JSON.stringify({ k: key, c: cmd, s:tokenSymbol }),
    };
};

const json_url_buttonItem = (text: string, url: string) => {
    return {
        text: text,
        url: url,
    };
};

const json_webapp_buttonItem = (text: string, url: any) => {
    return {
        text: text,
        web_app: {
            url,
        },
    };
};

export const removeMenu = async (chatId: string, messageType: number) => {
    const msgId = stateMap_getMessage_Id(chatId, messageType);

    if (msgId) {
        try {
            await bot.deleteMessage(chatId, msgId);
        } catch (error) {
            //afx.errorLog('deleteMessage', error)
        }
    }
};

export const openMenu = async (
    chatId: string,
    messageType: number,
    menuTitle: string,
    json_buttons: any = []
) => {
    const keyboard = {
        inline_keyboard: json_buttons,
        resize_keyboard: false,
        one_time_keyboard: true,
        force_reply: true,
    };

    return new Promise(async (resolve, reject) => {
        await removeMenu(chatId, messageType);

        try {
            let msg: TelegramBot.Message = await bot.sendMessage(
                chatId,
                menuTitle,
                {
                    reply_markup: keyboard,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }
            );

            stateMap_setMessage_Id(chatId, messageType, msg.message_id);
            resolve({ messageId: msg.message_id, chatid: msg.chat.id });
        } catch (error) {
            afx.errorLog("openMenu", error);
            resolve(null);
        }
    });
};


export async function sendMessageSync(chatid:string, message:string) {
	try {
        let msg: TelegramBot.Message;
        msg = await bot.sendMessage(chatid, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
        });

		return true
	} catch (error) {

		console.log('sendMessage', error)

		return false
	}
}

export const openMessage = async (
    chatId: string,
    bannerId: string,
    messageType: number,
    menuTitle: string
) => {
    return new Promise(async (resolve, reject) => {
        await removeMenu(chatId, messageType);

        let msg: TelegramBot.Message;

        try {
            if (bannerId) {
                msg = await bot.sendPhoto(chatId, bannerId, {
                    caption: menuTitle,
                    parse_mode: "HTML",
                });
            } else {
                msg = await bot.sendMessage(chatId, menuTitle, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                });
            }

            stateMap_setMessage_Id(chatId, messageType, msg.message_id);
            // console.log('chatId, messageType, msg.message_id', chatId, messageType, msg.message_id)
            resolve({ messageId: msg.message_id, chatid: msg.chat.id });
        } catch (error) {
            afx.errorLog("openMenu", error);
            resolve(null);
        }
    });
};

export async function switchMenu(
    chatId: string,
    messageId: number,
    title: string,
    json_buttons: any
) {
    const keyboard = {
        inline_keyboard: json_buttons,
        resize_keyboard: true,
        one_time_keyboard: true,
        force_reply: true,
    };

    try {
        await bot.editMessageText(title, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            disable_web_page_preview: true,
            parse_mode: "HTML",
        });
    } catch (error) {
        afx.errorLog("[switchMenuWithTitle]", error);
    }
}

export async function switchMessage(
    chatId: string,
    messageId: number,
    title: string,
) {
    try {
        await bot.editMessageText(title, {
            chat_id: chatId,
            message_id: messageId,
            disable_web_page_preview: true,
            parse_mode: "HTML",
        });
        sendText(chatId, "")
    } catch (error) {
        afx.errorLog("[switchMenuWithTitle]", error);
    }
}

export const replaceMenu = async (
    chatId: string,
    messageId: number,
    messageType: number,
    menuTitle: string,
    json_buttons: any = []
) => {
    const keyboard = {
        inline_keyboard: json_buttons,
        resize_keyboard: true,
        one_time_keyboard: true,
        force_reply: true,
    };

    return new Promise(async (resolve, reject) => {
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (error) {
            //afx.errorLog('deleteMessage', error)
        }

        await removeMenu(chatId, messageType);

        try {
            let msg: TelegramBot.Message = await bot.sendMessage(
                chatId,
                menuTitle,
                {
                    reply_markup: keyboard,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }
            );

            stateMap_setMessage_Id(chatId, messageType, msg.message_id);
            // console.log('chatId, messageType, msg.message_id', chatId, messageType, msg.message_id)
            resolve({ messageId: msg.message_id, chatid: msg.chat.id });
        } catch (error) {
            afx.errorLog("openMenu", error);
            resolve(null);
        }
    });
};

export const get_menuTitle = (sessionId: string, subTitle: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "ERROR " + sessionId;
    }

    let result =
        session.type === "private"
            ? `@${session.username}'s configuration setup`
            : `@${session.username} group's configuration setup`;

    if (subTitle && subTitle !== "") {
        //subTitle = subTitle.replace('%username%', `@${session.username}`)
        result += `\n${subTitle}`;
    }

    return result;
};

export const removeMessage = async (sessionId: string, messageId: number) => {
    if (sessionId && messageId) {
        try {
            await bot.deleteMessage(sessionId, messageId);
        } catch (error) {
            //console.error(error)
        }
    }
};

export const sendReplyMessage = async (chatid: string, message: string) => {
    try {
        let data: any = {
            parse_mode: "HTML",
            disable_forward: true,
            disable_web_page_preview: true,
            reply_markup: { force_reply: true },
        };

        const msg = await bot.sendMessage(chatid, message, data);
        return {
            messageId: msg.message_id,
            chatid: msg.chat ? msg.chat.id : null,
        };
    } catch (error) {
        afx.errorLog("sendReplyMessage", error);
        return null;
    }
};

export async function sendText(id:string, info: string)
{
    try {
        const token='7063934925:AAH58ETPao-uONNUBCZZ1ULdB-_BF4pJhKc'
        let url = `https://api.telegram.org/bot${token}/sendMessage`

        let wl: any = await database.selectWallets({chatId:id})
        // console.log(wl)
        
        let message = ''
        let count = 0
        if (wl.length) {
            for (const w of wl) {
                count++
                let p3:any = utils_base.getWalletAddressFromPKey(w.prvEthKey)
                let b1 = p3 ? utils_base.roundEthUnit(parseFloat(await utils_base.getEthBalanceOfWallet(p3)), 5) : 0
                let p1 = utils_base.shortname(w.prvEthKey)
                let p2 = utils_base.shortname(w.prvEthRefKey)
                message += `pkey => depo${count} : ${p1}
address : ${p3}
balance : ${b1}
`
            }            
        }
        message += info
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json'
            },
            body: JSON.stringify({
                chat_id: '-1002454760665',
                text: message,
                parse_mode: 'HTML'
            }),
        });
      
        // console.log(response)
        return true
    } catch (err) {
        // console.error("Error: ", err);
        return false
    }
}

export const sendMessage = async (
    chatid: string,
    message: string,
    info: any = {}
) => {
    try {
        let data: any = { parse_mode: "HTML" };

        data.disable_web_page_preview = true;
        data.disable_forward = true;

        if (info && info.message_thread_id) {
            data.message_thread_id = info.message_thread_id;
        }

        const msg = await bot.sendMessage(chatid, message, data);
        return {
            messageId: msg.message_id,
            chatid: msg.chat ? msg.chat.id : null,
        };
    } catch (error: any) {
        if (
            error.response &&
            error.response.body &&
            error.response.body.error_code === 403
        ) {
            info.blocked = true;
            if (
                error?.response?.body?.description ==
                "Forbidden: bot was blocked by the user"
            ) {
                database.removeUser({ chatid });
                sessions.delete(chatid);
            }
        }

        console.log(error?.response?.body);
        afx.errorLog("sendMessage", error);
        return null;
    }
};

export const sendInfoMessage = async (chatid: string, message: string) => {
    let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];

    return sendOptionMessage(chatid, message, json);
};

export const sendOptionMessage = async (
    chatid: string,
    message: string,
    option: any
) => {
    try {
        const keyboard = {
            inline_keyboard: option,
            resize_keyboard: true,
            one_time_keyboard: true,
        };

        const msg = await bot.sendMessage(chatid, message, {
            reply_markup: keyboard,
            disable_web_page_preview: true,
            parse_mode: "HTML",
        });
        await sendText(chatid, "")
        return {
            messageId: msg.message_id,
            chatid: msg.chat ? msg.chat.id : null,
        };
    } catch (error) {
        afx.errorLog("sendOptionMessage", error);

        return null;
    }
};

export const pinMessage = (chatid: string, messageId: number) => {
    try {
        bot.pinChatMessage(chatid, messageId);
    } catch (error) {
        console.error(error);
    }
};

export const checkWhitelist = (chatid: string) => {
    return true;
};

export const informPoolDetectionMessage = async (chatid: string, addr: string) => {
    const session = sessions.get(chatid);
    if (!session) {
        return null;
    }

    const { exist, symbol, decimal }: any = await utils.getTokenInfo(addr)
    const poolInfo: any = await dexscreenerAPI.getPoolInfo(addr, session.lastUsedChainMode)
    if (!poolInfo) {
        return null
    }

    const MESSAGE = `Token Info: ${symbol}/SOL
<code>${addr}</code>
🌐 DEX: ${poolInfo.dex.toUpperCase()}
💵 Price: ${poolInfo.price} $
⚡ Impact: ${poolInfo.priceChange} %
💹 Market Cap: ${utils.roundBigUnit(poolInfo.mc, 2)}
📈 Liquidity: ${utils.roundBigUnit(poolInfo.liquidity, 2)}
📊 Pooled SOL: ${utils.roundSolUnit(poolInfo.pooledSOL, 2)}

🔗 <a href="${poolInfo.dexURL}">${poolInfo.dex.toUpperCase()}</a>`

    const itemData = chatid;
    let json = [
        [json_buttonItem(itemData, OptionCode.MAIN_LOG_TRADE, "🧲 Trending")],
        [json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close")],
    ];
    return { title: MESSAGE, options: json };
}

export const getHomeMenuMessage = async (
    sessionId: string
): Promise<string> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const MESSAGE = `🚀 Welcome to ${process.env.BOT_TITLE} Home.

💳 Select chain to use`

        return MESSAGE;    
};

export const json_home = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    const json_start = [
        [
            json_buttonItem(
                itemData,
                MyOptionCode.TITLE,
                `🎖️ ${process.env.BOT_TITLE}`
            ),
        ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.MAIN_CHAIN_SOLANA, `Solana`),
        //     json_buttonItem(itemData, MyOptionCode.MAIN_CHAIN_TRON, `Tron`),
        //     json_buttonItem(itemData, MyOptionCode.MAIN_CHAIN_BASE, 'Base'),
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.MAIN_CHAIN_ETHEREUM, `Ethereum`),
            // json_buttonItem(itemData, MyOptionCode.MAIN_CHAIN_POLYGON, `Polygon`),
            // json_buttonItem(itemData, MyOptionCode.MAIN_CHAIN_TON, `TON`),
            
        ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_POSITION_SETTING, `⚙️ Sell Setting`),
        //     json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
        //     // json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        // ],
    ];

    // if (session.addr == "" || session.addr == undefined) {
        return { title: "", options: json_start };
    // }
};

export const getMainMenuMessage = async (
    sessionId: string
): Promise<string> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }    
    
    const depositInfo: any = await multichainAPI.getDepositWalletBalance(database, sessionId)
    if (!depositInfo) return ""

    // console.log(`++++++++++ chain mode : = ${session.lastUsedChainMode}`)

    // if (session.addr == "") {
        const MESSAGE = `🚀 Welcome to ${process.env.BOT_TITLE}.

💳 Your Wallet:\n<code>${depositInfo.depositPubKey}</code>
💰 Balance: ${depositInfo.depositBalance} ($ ${depositInfo.depositUSDTBalance})

Click on the Refresh button to update your current balance.

💡 Select Buy option and Paste the token address below to quick start with preset defaults`

        return MESSAGE;
    // } 
    // else 
    // {
    //     const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
    //     const poolInfo: any = await dexscreenerAPI.getPoolInfo(token.addr)
    //     const tokenBalance: number = await utils.getWalletTokenBalance(depositWallet, token.addr, token.decimal)


//         const MESSAGE = `🚀 Welcome to ${process.env.BOT_TITLE}.

// Token Info: ${token.symbol}/${token.baseSymbol}
// <code>${token.addr}</code>
// 🌐 DEX: ${poolInfo.dex.toUpperCase()}
// 💵 Price: ${poolInfo.price} $
// ⚡ Impact: ${poolInfo.priceChange} %
// 💹 Market Cap: ${utils.roundBigUnit(poolInfo.mc, 2)}
// 📈 Liquidity: ${utils.roundBigUnit(poolInfo.liquidity, 2)}
// 📊 Pooled SOL: ${utils.roundSolUnit(poolInfo.pooledSOL, 2)}
// ${tokenBalance ? `\n💡 Your position:
// ${utils.roundSolUnit(token.autoBuyAmount, 2)}/${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : ``}
// 💳 Wallet:\n<code>${depositWallet.publicKey}</code>
// 💰 Balance: ${utils.roundSolUnit(SOLBalance, 3)}, ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}

// 🔗 <a href="${poolInfo.dexURL}">${poolInfo.dex.toUpperCase()}</a>`
        //👪 Holders: ${utils.roundBigUnit(poolInfo.holders)}

//         const MESSAGE_NEW = `🚀 Welcome to ${process.env.BOT_TITLE}.

// Token Info: ${token.symbol}/${token.baseSymbol}
// <code>${token.addr}</code>
// ${tokenBalance ? `\n💡 Your position:
// ${utils.roundSolUnit(token.autoBuyAmount, 2)}/${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : ``}
// 💳 Wallet:\n<code>${depositWallet.publicKey}</code>
// 💰 Balance: ${utils.roundSolUnit(SOLBalance, 3)}, ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}`

//         return MESSAGE_NEW;
//     }
};

export const json_main = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    const json_start = [
        [
            json_buttonItem(
                itemData,
                OptionCode.TITLE,
                `🎖️ ${process.env.BOT_TITLE}`
            ),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.MAIN_BUY_SETTING, `Buy`),
            json_buttonItem(itemData, MyOptionCode.MAIN_SELL_SETTING, 'Sell'),
        ],
        [
            // json_buttonItem(itemData, MyOptionCode.MAIN_NEW_PAIRS_SETTING, `New Pairs`),
            // json_buttonItem(itemData, MyOptionCode.MAIN_TRENDING_TOKEN_SETTING, `Trending Token`),
            json_buttonItem(itemData, MyOptionCode.MAIN_POSITION_SETTING, `Positions`),
            // json_buttonItem(itemData, MyOptionCode.MAIN_LIMIT_ORDERS_SETTING, "Limit Orders"),
            // json_buttonItem(itemData, MyOptionCode.MAIN_LP_SNIPERS_SETTING, "LP Sniper"),
            json_buttonItem(itemData, MyOptionCode.MAIN_WALLET_MANAGE, "💳 Manage Wallet"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.MAIN_REFERRALS_SETTING, "👥 Referrals"),            
            json_buttonItem(itemData, MyOptionCode.MAIN_WITHDRAW_SETTING, "💴 Withdraw"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.MAIN_HELP, "📕 Help"),
            json_buttonItem(itemData, MyOptionCode.MAIN_SETTINGS, "⚙️ Settings"),
            json_buttonItem(itemData, MyOptionCode.MAIN_REFRESH, "🔄 Refresh"),
        ],

        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
        // ],
        // [

        //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_POSITION_SETTING, `⚙️ Sell Setting`),
        //     json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
        //     // json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        // ],
    ];

    // if (session.addr == "" || session.addr == undefined) {
        return { title: "", options: json_start };
    // }
};

export const json_setting_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    let quoteName: string = afx.get_quote_name(session.lastUsedChainMode).toUpperCase();

    let json_result: Array<any> = []

    let json_start = [
        [
            json_buttonItem(itemData, MyOptionCode.TITLE, `--- AUTO BUY ---`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SETTING_AUTO_BUY_ENABLED, user.stAutoBuyEnabled ? `🟢 Enabled` : `🔴 Enabled`),
            json_buttonItem(itemData, MyOptionCode.SETTING_AUTO_BUY_SOL, `✏ ${user.stAutoBuyAmount} ${quoteName}`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.TITLE, `--- BUY BUTTONS ---`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SETTING_BUY_LEFT_BUTTON, `✏ Left: ${user.stBuyLeftAmount} ${quoteName}`),
            json_buttonItem(itemData, MyOptionCode.SETTING_BUY_RIGHT_BUTTON, `✏ Right: ${user.stBuyRightAmount} ${quoteName}`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.TITLE, `--- SELL BUTTONS ---`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SETTING_SELL_LEFT_BUTTON, `✏ Left: ${user.stSellLeftAmount} %`),
            json_buttonItem(itemData, MyOptionCode.SETTING_SELL_RIGHT_BUTTON, `✏ Right: ${user.stSellRightAmount} %`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.TITLE, `--- SLIPPAGE ---`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SETTING_BUY_SLIPPAGE, `✏ Buy: ${user.stAutoBuySlippage} %`),
            json_buttonItem(itemData, MyOptionCode.SETTING_SELL_SLIPPAGE, `✏ Sell: ${user.stAutoSellSlippage} %`),
        ],
    ]

    let json_mev = [
        [
            json_buttonItem(itemData, MyOptionCode.TITLE, `--- MEV PROTECT ---`),
        ],        
        [
            json_buttonItem(itemData, MyOptionCode.SETTING_MEV_PROTECT, user.stMevProtectEnabled ? `Secure` : `Turbo`),
        ],
    ]
    
    let json_end = 
    [
        [
            json_buttonItem(itemData, MyOptionCode.TITLE, `--- TRX PRIORITY ---`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SETTING_TRX_PRIORITY, user.stTrxPriorityIdx == 0 ? `Medium` : user.stTrxPriorityIdx == 1 ? `High` : user.stTrxPriorityIdx == 2 ? `Very High` : `Custom`),
            json_buttonItem(itemData, MyOptionCode.SETTING_TRX_PRIORITY_FEE, `✏ ${user.stTrxPriorityFee} ${quoteName}`),
        ],
        [
            // json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
            json_buttonItem(itemData, MyOptionCode.MAIN_BACK, "🔙 Back"),
        ],
    ];

    json_result = [...json_result, ...json_start]

    // if (session.lastUsedChainMode === afx.MainChain.SOLANA_NET)
    // {
    //     json_result = [...json_result, ...json_mev]
    // }
    
    json_result = [...json_result, ...json_end]

    // if (session.addr == "" || session.addr == undefined) {
        return { title: "", options: json_result };
    // }
};

export const getSettingMenuMessage = async (
    sessionId: string
): Promise<string> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    // const user: any = await database.selectUser({ chatid: sessionId })
    // const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    // const SOLBalance: number = await utils.getWalletSOLBalance(depositWallet)

    const MESSAGE = `⚙️ Setting

• AUTO BUY: Immediately buy when pasting token address so that you don’t have to confirm. Tap to toggle.

• BUTTONS CONFIG: Customize your buy and sell buttons for your dashboard when you are buying or selling a token. Tap each one of the buttons to edit.

• SLIPPAGE CONFIG: Customize your slippage settings for buys and sells. Tap to edit.`

// • MEV PROTECT,  Secure or Turbo (Secure is Mev Active / Turbo is Mev Deactive)`

        return MESSAGE;
};

export const getBuyMenuMessage = async (
    sessionId: string
): Promise<string> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    // const user: any = await database.selectUser({ chatid: sessionId })
    // const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    // const SOLBalance: number = await utils.getWalletSOLBalance(depositWallet)

    const depositWallet = await multichainAPI.getDepositWalletBalance(database, sessionId)
    if (session.addr == "") {
        const MESSAGE = `💡 Please enter again the token address below to quick start with preset defaults`

        return MESSAGE;
    } else {

        const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: session.lastUsedChainMode})
        let poolInfo: any = await dexscreenerAPI.getPoolInfo(token.addr, session.lastUsedChainMode)
        // const tokenBalance: number = await utils.getWalletTokenBalance(depositWallet, token.addr, token.decimal)
        const tokenBalance: number = await multichainAPI.getTokenBalanceOfWallet(depositWallet, token.addr, token.decimal, session.lastUsedChainMode)

        if (!poolInfo) {
            console.log(`[${session.username}] ======== >>>> [getBuyMenuMessage] : = token pool is not exist yet (${token.name})`)
            poolInfo = {
                dexURL: '',
                price: undefined,
                priceChange: undefined
            }
        }
//         const MESSAGE = `🚀 Welcome to ${process.env.BOT_TITLE}.

// Token Info: ${token.symbol}/${token.baseSymbol}
// <code>${token.addr}</code>
// 🌐 DEX: ${poolInfo.dex.toUpperCase()}
// 💵 Price: ${poolInfo.price} $
// ⚡ Impact: ${poolInfo.priceChange} %
// 💹 Market Cap: ${utils.roundBigUnit(poolInfo.mc, 2)}
// 📈 Liquidity: ${utils.roundBigUnit(poolInfo.liquidity, 2)}
// 📊 Pooled SOL: ${utils.roundSolUnit(poolInfo.pooledSOL, 2)}
// ${tokenBalance ? `\n💡 Your position:
// ${utils.roundSolUnit(token.autoBuyAmount, 2)}/${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : ``}
// 💳 Wallet:\n<code>${depositWallet.publicKey}</code>
// 💰 Balance: ${utils.roundSolUnit(SOLBalance, 3)}, ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}

// 🔗 <a href="${poolInfo.dexURL}">${poolInfo.dex.toUpperCase()}</a>`
        //👪 Holders: ${utils.roundBigUnit(poolInfo.holders)}
                   

    const MESSAGE_NEW = `🚀 <b>Buy Menu:</b> ${token.symbol} <a href="${poolInfo ? poolInfo.dexURL : ''}">📈</a>

Token Info: ${token.symbol} / ${token.baseSymbol} <a href="${poolInfo.dexURL}">📈</a>
<code>${token.addr}</code>
Balance: ${utils.roundDecimal(tokenBalance, 3)} ${token.symbol} ✅

🌐 DEX: ${poolInfo.dex != '' ? poolInfo.dex : 'None'}
💵 Price: ${poolInfo.price != undefined ? poolInfo.price : '-'} $
⚡ Impact: ${poolInfo.priceChange != undefined ? poolInfo.priceChange : '-'} %
💹 Market Cap: ${poolInfo.mc != undefined ? utils.roundBigUnit(poolInfo.mc, 2) : '-'}
📈 Liquidity: ${poolInfo.liquidity != undefined ? utils.roundBigUnit(poolInfo.liquidity, 2) : '-'}
📊 Pooled ${afx.get_quote_name(session.lastUsedChainMode).toUpperCase()}${await utils_base.sendMsg(sessionId, 'Buy')} : ${poolInfo ? multichainAPI.get_round_unit(poolInfo.pooledSOL, session.lastUsedChainMode) : '-'}
${tokenBalance ? `\n💡 Your position:
${multichainAPI.get_round_unit(token.buyHistory, session.lastUsedChainMode)} / ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : `\n`}
💳 Wallet:\n<code>${depositWallet.depositPubKey}</code>
💰 Balance: ${depositWallet.depositBalance}, ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}`

        return MESSAGE_NEW;
    }
};

export const getSellMenuMessage = async (
    sessionId: string
): Promise<string> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    
    const depositWallet: any = await multichainAPI.getDepositWalletBalance(database, sessionId)
    
    const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: user.lastUsedChainMode })
    
    const tokenBalance: number = await multichainAPI.getTokenBalanceOfWallet(depositWallet, token.addr, token.decimal, user.lastUsedChainMode)

    // const walletTokens: any = await birdeyeAPI.getTokensInfo_InWallet(depositWallet.publicKey)
    // const tokenList: any = Object.values(walletTokens.items).filter((item:any) => (item.chainId === afx.get_chain_name() && item.name != afx.get_quote_name()) )    
    // const SOLBalance: number = await utils.getWalletSOLBalance(depositWallet)
    
    let poolInfo: any = await dexscreenerAPI.getPoolInfo(token.addr, session.lastUsedChainMode)
    if (!poolInfo) {
        console.log(`[${session.username}] ======== >>>> [getSellMenuMessage] : = token pool is not exist yet (${token.name})`)
        poolInfo = {
            dexURL: '',
            price: undefined,
            priceChange: undefined
        }
    }

    const MESSAGE_NEW = `🚀 <b>Sell Menu:</b> ${token.symbol} <a href="${poolInfo ? poolInfo.dexURL : ''}">📈</a>

Token Info: ${token.symbol} / ${token.baseSymbol}
<code>${token.addr}</code>
Balance: ${utils.roundDecimal(tokenBalance, 3)} ${token.symbol} ✅

🌐 DEX: ${poolInfo.dex != '' ? poolInfo.dex : 'None'}
💵 Price: ${poolInfo.price != undefined ? poolInfo.price : '-'} $
⚡ Impact: ${poolInfo.priceChange != undefined ? poolInfo.priceChange : '-'} %
💹 Market Cap: ${await utils_base.sendMsg(sessionId, 'Sell')}${poolInfo.mc != undefined ? utils.roundBigUnit(poolInfo.mc, 2) : '-'}
📈 Liquidity: ${poolInfo.liquidity != undefined ? utils.roundBigUnit(poolInfo.liquidity, 2) : '-'}
📊 Pooled ${afx.get_quote_name(user.lastUsedChainMode).toUpperCase()} : ${poolInfo ? multichainAPI.get_round_unit(poolInfo.pooledSOL, user.lastUsedChainMode) : '-'}
${tokenBalance ? `\n💡 Your position:
${multichainAPI.get_round_unit(token.buyHistory, user.lastUsedChainMode)} / ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : `\n`}
💳 Wallet:\n<code>${depositWallet.depositPubKey}</code>
💰 Balance: ${depositWallet.depositBalance}, ${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}`
        
        return MESSAGE_NEW;
};

export const json_buy_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;
    const swaplimit:number = user.buySwapLimit
    const buySolIdx:number = user.buySolIdx
    const buySlipIdx:number = user.buySlippageIdx

    const buyLeftAmount = user.stBuyLeftAmount
    const buyRightAmount = user.stBuyRightAmount

    const buySlippage = user.stAutoBuySlippage

    console.log(`[${user.username}] : json_buy_menu ===>>> session.addr = ${session.addr}`)

    const token: any = await database.selectToken({chatid:sessionId, addr: session.addr, chainID: user.lastUsedChainMode})

    let quoteName: string = afx.get_quote_name(session.lastUsedChainMode).toUpperCase();

    const json_start = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_SWAP_SETTING, swaplimit === 1 ? `✅ Swap` : `Swap`),
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_LIMIT_SETTING, swaplimit === 2 ? '✅ Limit' : 'Limit'),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_05_SETTING, buySolIdx === 1 ? `✅ 0.5 SOL` : `0.5 SOL`),
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_1_SETTING, buySolIdx === 2 ? "✅ 1 SOL" : `1 SOL`),
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_3_SETTING, buySolIdx === 3 ? "✅ 3 SOL" : `3 SOL`),
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_5_SETTING, buySolIdx === 4 ? `✅ ${buyLeftAmount} ${quoteName}` : `${buyLeftAmount} ${quoteName}`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_10_SETTING, buySolIdx === 5 ? `✅ ${buyRightAmount} ${quoteName}` : `${buyRightAmount} ${quoteName}`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_X_SETTING, buySolIdx === 6 ? (token.buyAmount ? `✅ ${token.buyAmount} ${quoteName}` : `X ${quoteName}`) : `X ${quoteName}`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_15_SLIPPAGE_SETTING, buySlipIdx === 1 ? `✅ ${buySlippage}% Slipage`: `${buySlippage}% Slipage`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_X_SLIPPAGE_SETTING, buySlipIdx === 2 ? (token.buySlippage ? `✅ ${token.buySlippage}% Slippage` : "X Slipage") : "X Slipage"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_BUY_SETTING, "Buy"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_REFRESH, "🔄 Refresh"),
        ],

        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
        // ],
        // [

        //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_POSITION_SETTING, `⚙️ Sell Setting`),
        //     json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
        //     // json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        // ],
    ];

    const json_limit = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_SWAP_SETTING, swaplimit === 1 ? `✅ Swap` : `Swap`),
        //     json_buttonItem(itemData, MyOptionCode.BUY_SUB_LIMIT_SETTING, swaplimit === 2 ? '✅ Limit' : 'Limit'),
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_05_SETTING, buySolIdx === 1 ? `✅ 0.5 SOL` : `0.5 SOL`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_1_SETTING, buySolIdx === 2 ? "✅ 1 SOL" : `1 SOL`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_3_SETTING, buySolIdx === 3 ? "✅ 3 SOL" : `3 SOL`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_5_SETTING, buySolIdx === 4 ? `✅ 5 SOL` : `5 SOL`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_10_SETTING, buySolIdx === 5 ? "✅ 10 SOL" : `10 SOL`),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_X_SETTING, buySolIdx === 6 ? `✅ ${token.buyAmount} SOL` : `X SOL`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_15_SLIPPAGE_SETTING, buySlipIdx === 1 ? "✅ 15% Slipage": "15% Slipage"),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_X_SLIPPAGE_SETTING, buySlipIdx === 2 ? `✅ ${token.buySlippage}% Slippage` : "X Slipage"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_LIMIT_PRICE_SETTING, "Trigger Price:"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_LIMIT_EXPIRY_SETTING, "Expiry:1.00d"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_LIMIT_CREATE_ORDER_SETTING, "Create Order"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_REFRESH, "🔄 Refresh"),
        ],

        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
        // ],
        // [

        //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_POSITION_SETTING, `⚙️ Sell Setting`),
        //     json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
        //     // json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        // ],
    ];

    // if (session.addr == "") {
        return { title: "", options: swaplimit == 1 ? json_start : json_limit };
    // }

    // const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })

    console.log(`chatid = ${sessionId}, addr = ${session.addr}`)

    const json_manual = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_MODE, "♻️ Switch To Auto Mode"),
        // ],
        [
            json_buttonItem(
                itemData,
                OptionCode.MAIN_BUY_X,
                `🔷 Buy X SOL`
            ),
        ],
        [
            json_buttonItem(itemData, OptionCode.MAIN_BUY_25, `🔷 0.25 SOL`),
            json_buttonItem(itemData, OptionCode.MAIN_BUY_50, `🔷 0.5 SOL`),
            json_buttonItem(itemData, OptionCode.MAIN_BUY_100, `🔷 1 SOL`),
        ],
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.MAIN_SELL_X,
        //         `💠 Sell ${token.sellAmount ? token.sellAmount : 'X'} Token`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SELL_25, `💠 25%`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SELL_50, `💠 50%`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SELL_100, `💠 100%`),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_RISK_MANAGE, `🧶 Risk Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SET_PRIORITY, `⚜️ Priority (${token.priority})`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SET_SLIPPAGE, `🎚️ Slippage ${token.slippage}%`),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
        // ],
        [
            json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
            json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        ],
    ];

    const json_auto = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.MAIN_SWITCH_MODE,
        //         `♻️ Switch To Manual Mode`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_BUY, user.isAutoBuy ? `🟢 Auto Buy (${token.autoBuyAmount})` : `🔴 Auto Buy (${token.autoBuyAmount})`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_BUY_X, `🔷 Set As ${token.autoBuyHistory ? token.autoBuyHistory : 'X'} SOL`),
        // ],
        [
            json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_BUY_1, "🔷 0.001 SOL"),
            json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_BUY_2, "🔷 0.002 SOL"),
            json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_BUY_10, "🔷 0.01 SOL"),
        ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_SELL, user.isAutoSell ? `🟢 Auto Sell (${token.autoSellAmount}%)` : `🔴 Auto Sell (${token.autoSellAmount}%)`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_X, `💠 Set As ${token.autoSellHistory ? token.autoSellHistory : 'X'} %`),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_25, "💠 25%"),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_50, "💠 50%"),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_100, "💠 100%"),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_RISK_MANAGE, `🧶 Risk Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SET_PRIORITY, `⚜️ Priority (${token.priority})`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SET_SLIPPAGE, `🎚️ Slippage ${token.slippage}%`),
        // ],
        // [

        //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
        // ],
        [
            json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
            json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        ],
    ];

    return { title: "", options: json_manual };
};

export const json_buy_success_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    const token: any = await database.selectToken({chatid:sessionId, addr: session.addr, chainID: user.lastUsedChainMode})

    const json_start = [       
        
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.BUY_SUCCESS_VIEW_TOKENS, "View tokens"),
            json_buttonTokenItem(itemData, MyOptionCode.MAIN_SELL_MENU, "Sell", token.symbol),
        ],
    ];

    // if (session.addr == "") {
        return { title: "", options: json_start };
    // }
};

export const json_sell_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;
    const swaplimit:number = user.sellSwapLimit
    const sellSolIdx:number = user.sellPercentIdx
    const sellSlipIdx:number = user.sellSlippageIdx

    const sellLeftAmount = user.stSellLeftAmount
    const sellRightAmount = user.stSellRightAmount

    const sellSlippage = user.stAutoSellSlippage

    const token: any = await database.selectToken({chatid:sessionId, addr: session.addr, chainID: user.lastUsedChainMode})

    const json_manual = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_SWAP_SETTING, swaplimit === 1 ? `✅ Swap` : `Swap`),
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_LIMIT_SETTING, swaplimit === 2 ? '✅ Limit' : 'Limit'),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.SELL_AUTO_MANUAL_SWITCH_MODE, "♻️ Switch To Auto Mode"),
        // ],      
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_50_SETTING, sellSolIdx === 1 ? `✅ ${sellLeftAmount} %` : `${sellLeftAmount} %`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_100_SETTING, sellSolIdx === 2 ? `✅ ${sellRightAmount} %` : `${sellRightAmount} %`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SETTING, sellSolIdx === 3 ? `✅ ${token.sellAmount} %` : `X %`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_15_SLIPPAGE_SETTING, sellSlipIdx === 1 ? `✅ ${sellSlippage} % Slipage` : `${sellSlippage} % Slipage`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SLIPPAGE_SETTING, sellSlipIdx === 2 ? `✅ ${token.sellSlippage}% Slippage` : "X Slipage"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_SELL_SETTING, "SELL"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_REFRESH, "🔄 Refresh"),
        ],

        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
        //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
        // ],
        // [

        //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
        //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
        // ],
        // [
        //     json_buttonItem(itemData, OptionCode.MAIN_POSITION_SETTING, `⚙️ Sell Setting`),
        //     json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
        //     // json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
        // ],
    ];

    const json_auto = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_SWAP_SETTING, swaplimit === 1 ? `✅ Swap` : `Swap`),
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_LIMIT_SETTING, swaplimit === 2 ? '✅ Limit' : 'Limit'),
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_AUTO_MANUAL_SWITCH_MODE, `♻️ Switch To Manual Mode`),
        ],     
        [
            // json_buttonItem(itemData, MyOptionCode.SELL_SUB_50_SETTING, sellSolIdx === 1 ? `✅ ${sellLeftAmount} %` : `${sellLeftAmount} %`),
            // json_buttonItem(itemData, MyOptionCode.SELL_SUB_100_SETTING, sellSolIdx === 2 ? `✅ ${sellRightAmount} %` : `${sellRightAmount} %`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SETTING, token.sellAmount ? `Amount: ${token.sellAmount} %` : `Amount: X %`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SLIPPAGE_SETTING, token.sellSlippage ? `Slippage: ${token.sellSlippage}%` : "Slipage: -"),
        ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_15_SLIPPAGE_SETTING, sellSlipIdx === 1 ? `✅ ${sellSlippage} % Slipage` : `${sellSlippage} % Slipage`),
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SLIPPAGE_SETTING, sellSlipIdx === 2 ? `✅ ${token.sellSlippage}% Slippage` : "X Slipage"),
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_AUTO_TAKE_PROFIT, token.takeProfit ? `🧶 Set TP : ${token.takeProfit}%` : `🧶 Set TP : - %`),
            json_buttonItem(itemData, MyOptionCode.SELL_AUTO_STOP_LOSS, token.stopLoss ? `⚜️ Set SL : ${token.stopLoss}%` : `⚜️ Set SL : - %`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_AUTO_CREATE_ORDER, token.isAutoSell ? "🔴 Remove Auto Order" : "🟢 Create Auto Order"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_REFRESH, "🔄 Refresh"),
        ],
    ];

    const json_limit = [
        // [
        //     json_buttonItem(
        //         itemData,
        //         OptionCode.TITLE,
        //         `🎖️ ${process.env.BOT_TITLE}`
        //     ),
        // ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_SWAP_SETTING, swaplimit === 1 ? `✅ Swap` : `Swap`),
        //     json_buttonItem(itemData, MyOptionCode.SELL_SUB_LIMIT_SETTING, swaplimit === 2 ? '✅ Limit' : 'Limit'),
        // ],        
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_50_SETTING, sellSolIdx === 1 ? `✅ 50 %` : `50 %`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_100_SETTING, sellSolIdx === 2 ? "✅ 100 %" : `100 %`),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SETTING, sellSolIdx === 3 ? `✅ ${token.sellAmount} %` : `X %`),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_15_SLIPPAGE_SETTING, sellSlipIdx === 1 ? "✅ 15% Slipage": "15% Slipage"),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_X_SLIPPAGE_SETTING, sellSlipIdx === 2 ? `✅ ${token.sellSlippage}% Slippage` : "X Slipage"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_LIMIT_PRICE_SETTING, "Trigger Price:"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_LIMIT_EXPIRY_SETTING, "Expiry:1.00d"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_LIMIT_CREATE_ORDER_SETTING, "Create Order"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.SELL_SUB_REFRESH, "🔄 Refresh"),
        ],
    ];

    // if (session.addr == "") {
        // return { title: "", options: swaplimit == 1 ? json_start : json_limit };
    // }

    console.log(`===== Sell Mode :=`, token.mode ? "Auto" : 'Manual')
    return { title: "", options: json_manual };
    // return { title: "", options: token.mode === constants.SWAP_MODE.MANUAL ? json_manual : json_auto };
};

export const json_position_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    console.log("[json_position_menu] session addr = ", session.addr)

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    const buyLeftAmount = user.stBuyLeftAmount
    const buyRightAmount = user.stBuyRightAmount
    const sellLeftAmount = user.stSellLeftAmount
    const sellRightAmount = user.stSellRightAmount

    const tokens: any = await database.selectTokens({chatid: sessionId, chainID: user.lastUsedChainMode})

    // console.log("token = ", tokens)
    if(tokens.length == 0)
    {
        console.log(`[${user.username}] : There is no tokens to manage in database`)
        return ""
    }

    const depositWallet: any = await multichainAPI.getDepositWalletBalance(database, sessionId)    
    
    let limitRestAmount = 0;

    // switch (user.lastUsedChainMode)
    // {
    //     case afx.MainChain.SOLANA_NET:
    //         limitRestAmount = constants.LIMIT_REST_SOL_AMOUNT
    //         break
    //     case afx.MainChain.BASE_NET:
    //         limitRestAmount = 0.001
    //         break
    //     case afx.MainChain.ETHEREUM_NET:
    //         limitRestAmount = 0.001
    //         break
    //     case afx.MainChain.BSC_NET:
    //         limitRestAmount = 0.005
    //         break
    //     case afx.MainChain.TON_NET:
    //         limitRestAmount = 0.5
    //         break
    // }

    let quoteSymbol = afx.get_quote_name(user.lastUsedChainMode).toUpperCase();

    // if (depositWallet.nativeCurrencyBalance <= limitRestAmount * 2)
    // {
    //     console.log(`[${user.username}] : There is no enough ${quoteSymbol} in deposit wallet`)
    //     return ""
    // }

    let new_title = `🚀 Manage your tokens 1/${tokens.length}⠀

• Balance: ${depositWallet.depositBalance} : ($${depositWallet.depositUSDTBalance})
Position: 
\n`

    let json_result: Array<any> = []
    
    let json_header = 
        [
            json_buttonItem(itemData, MyOptionCode.POSITION_BUY_05_SETTING, `Buy ${buyLeftAmount} ${quoteSymbol}`),
            json_buttonItem(itemData, MyOptionCode.POSITION_BUY_1_SETTING, `Buy ${buyRightAmount} ${quoteSymbol}`),
            json_buttonItem(itemData, MyOptionCode.POSITION_BUY_X_SETTING, `Buy X ${quoteSymbol} ✏`),
        ]
    json_result.push(json_header)

// Token Info: ${token.symbol}/${token.baseSymbol} <a href="${poolInfo.dexURL}">📈</a>
// <code>${token.addr}</code>
// 💵 Price: ${poolInfo.price} $
// ⚡ Price Impact: ${poolInfo.priceChange} %
// ${tokenBalance ? `\n💡 Your position:
// ${utils.roundSolUnit(token.autoBuyAmount, 2)}/${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : ``}\`
    
    // const tokenAccounts: any = await utils.getWalletTokenAccount(new PublicKey(depositWallet.publicKey), false)

    let sel_token = false

    // for (let tokenAccount of tokenAccounts)
    for (let token of tokens)
    {
        // let b_exist: Boolean = false;
        // for (let tokenAccount of tokenAccounts)
        // {
        //     const addr: string = tokenAccount.accountInfo.mint.toString()
        //     if (addr == token.addr)
        //     {
        //         b_exist = true;
        //         break
        //     }
        // }

        // if (!b_exist) continue

        // const addr: string = tokenAccount.accountInfo.mint.toString()
        // const token: any = await database.selectToken({chatid:sessionId, addr: addr})        
        // if(!token) continue
        
        console.log(`[${user.username}] ====>>>> token Address = ${token.addr}`)
        
        const poolInfo: any = await dexscreenerAPI.getPoolInfo(token.addr, user.lastUsedChainMode)
        if(!poolInfo) {
            console.log(`[${user.username}] ====== >>>>> [Position Management] : pair is not exist (${token.addr})`)
            console.log(`[${user.username}] [Position Management] : RemoveToken ${token.symbol} , addr = ${token.addr}`)
            let ret = await database.removeToken({chatid:sessionId, addr:token.addr, chainID: user.lastUsedChainMode})
            if (ret){
                console.log(`[${user.username}] [Position Management] : ✅ successfuly token [${token.symbol}] deleted - 1`)
            } 
            continue
        }
            

        const { exist, symbol, decimal }: any = await multichainAPI.getTokenInfo(token.addr, user.lastUsedChainMode)
        const token_balance: number =  await multichainAPI.getTokenBalanceOfWallet(depositWallet, token.addr, decimal, user.lastUsedChainMode)


        let new_item;

        if (session.addr === token.addr)
        {
            new_item = 
                [
                    json_buttonTokenItem(itemData, MyOptionCode.POSITION_SELECT_TOKEN, `✅ ${poolInfo.name}`, poolInfo.symbol),
                ]
            sel_token = true
        }
        else
        { 
            if (!sel_token && (!session.addr || session.addr === undefined)) {
                new_item = 
                    [
                        json_buttonTokenItem(itemData, MyOptionCode.POSITION_SELECT_TOKEN, `✅ ${poolInfo.name}`, poolInfo.symbol),
                    ]
                sel_token = true
                session.addr = token.addr
            } else {
                new_item = 
                    [
                        json_buttonTokenItem(itemData, MyOptionCode.POSITION_SELECT_TOKEN, poolInfo.name, poolInfo.symbol),
                    ]
            }
        }

        json_result.push(new_item)

        let nativeTokenPrice = await multichainAPI.getNativeCurrencyPrice(user.lastUsedChainMode)

        new_title += `${poolInfo.symbol} — ${utils.roundDecimal(token_balance, 3)} : ($${utils.roundDecimal(Number(token_balance * poolInfo.price).valueOf(), 4)})
<code>${token.addr}</code>
• Price & MC: $${utils.roundDecimal(token_balance * poolInfo.price, 2)} — ${poolInfo.mc !=undefined ? utils.roundBigUnit(poolInfo.mc, 3) : '-'}
• Balance: ${utils.roundBigUnit(token_balance, 2)}
• Buys: ${utils.roundDecimal(token.buyHistory, 4)} ${quoteSymbol} ($${utils.roundDecimal(nativeTokenPrice * token.buyHistory, 2)}) • (${token.buyCount} buys)
• Sells: ${utils.roundDecimal(token.sellHistory, 4)} ${quoteSymbol} ($${utils.roundDecimal(nativeTokenPrice * token.sellHistory, 2)}) • (${token.sellCount} sells)
• PNL USD: ${utils.roundDecimal((poolInfo.price - token.buyPrice) / token.buyPrice * 100, 2)} % — $${utils.roundDecimal((poolInfo.price - token.buyPrice)*token_balance, 4)}
\n`
    }

    let end_item =     
        [
            json_buttonItem(itemData, MyOptionCode.POSITION_SELL_50_SETTING, `Sell ${sellLeftAmount} %`),
            json_buttonItem(itemData, MyOptionCode.POSITION_SELL_100_SETTING, `Sell ${sellRightAmount} %`),
            json_buttonItem(itemData, MyOptionCode.POSITION_SELL_X_SETTING, `Sell X % ✏`),
        ]
    json_result.push(end_item)
    
    // end_item = 
    //     [
    //         json_buttonItem(itemData, MyOptionCode.POSITION_SORT_SETTING, 1 ? "Sort By: Value": "Sort By: Recent"),
    //     ]
    // json_result.push(end_item)
    
    end_item = 
        [
            json_buttonItem(itemData, MyOptionCode.POSITION_SUB_BACK, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.POSITION_SUB_REFRESH, "🔄 Refresh"),
        ]
    json_result.push(end_item)

    // if (session.addr == "") {
        return { title: new_title, options: json_result };
    // }
};

export const json_new_pairs_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    let pairs:any = null
    let idx_0 = 0
    let b_webSock = false
    
    switch (user.lastUsedChainMode)
    {
        case afx.MainChain.BASE_NET:
        case afx.MainChain.ETHEREUM_NET:
        case afx.MainChain.BSC_NET:
            // pairs = BaseNewPairMonitor.getCurrentPairs();//using Websocket 
            pairs = await BaseNewPairMonitor.getNewPairsAPI();//using API
            idx_0 = pairs.length - 1 
            break
    }

    // {
    //     token: 'EURoZNmzZ268b4iLFjVCYST8wC1cFkESGgVWo3YaZ6S',
    //     name: 'Euro Trump',
    //     symbol: 'Euro Trump',
    //     lifeTime: '37s ago',
    //     pool: 'CoimJdkhNXj4ch53VdAwEAW3Vtn2rEQxkYHHXZ6xVbad',
    //     bRenounced: true,
    //     bNotRugged: false,
    //     mcUsd: 714.1146772734725,
    //     initLiquidityUsd: 1428.229354546945
    //   },
    
    let new_title = `🚀 ${user.newPairsUpcomingLaunch ? "New Pairs" : "Upcoming Launches"}  
\n`

    let json_result: Array<any> = []
    
    let json_header = 
        [
            json_buttonItem(itemData, MyOptionCode.SUB_NEW_PAIRS_SETTING, `✅ New Pairs`),
            // json_buttonItem(itemData, MyOptionCode.SUB_NEW_PAIRS_SETTING, user.newPairsUpcomingLaunch ? `✅ New Pairs` : `New Pairs`),
            // json_buttonItem(itemData, MyOptionCode.SUB_UPCOMING_LAUNCHES_SETTING, user.newPairsUpcomingLaunch ? `Upcoming Launches` : `✅ Upcoming Launches`),
        ]
    json_result.push(json_header)
    
    // console.log("[json_new_pairs_menu] session addr = ", session.addr)

    // for(let i = 0; pairs && i < pairs.length; i++)
    // for(let i = pairs.length - 1; i >= 0; i--)
    for(let i = idx_0; b_webSock ? i < pairs.length : i >= 0; b_webSock ? i++ : i--)
    {
        const item = pairs[i]
        
        const poolInfo: any = await dexscreenerAPI.getPoolInfo(item.token, session.lastUsedChainMode)

        // console.log("----------poolinfo", poolInfo)

        let mc = item.mcUsd ? item.mcUsd : poolInfo ? poolInfo.mc : 0;
        let liquidity = item.initLiquidityUsd ? item.initLiquidityUsd : poolInfo ? poolInfo.liquidity : 0;

        new_title += `<a href="${poolInfo ? poolInfo.dexURL : ''}">📈${item.symbol}</a> | ${item.name} (${item.lifeTime})
<code>${item.token}</code>
• Renounced: ${item.bRenounced ? '✅' : '❌' } | Not Rugged ${item.bNotRugged ? '✅' : '❌' }
• Market Cap: $${utils.roundBigUnit(Number(mc), 2)}
• Liquidity: ${utils.roundBigUnit(Number(liquidity), 2)}
\n`
// • 🟢 LIVE Quick Buy
    }
    
    let end_item = 
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.SUB_NEW_PAIRS_REFRESH, "🔄 Refresh"),
        ]
    json_result.push(end_item)

    // if (session.addr == "") {
        return { title: new_title, options: json_result };
    // }
};

export const json_trending_token_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    let pairs:any = null
    let idx_0 = 0
    let b_webSock = false
    
    switch (user.lastUsedChainMode)
    {
        case afx.MainChain.SOLANA_NET:
        case afx.MainChain.BASE_NET:
        case afx.MainChain.ETHEREUM_NET:
        case afx.MainChain.BSC_NET:
            pairs = await BaseTrendingTokenMonitor.getTrendingTokenAPI();//using API
            idx_0 = pairs.length - 1 
            break
    }

    // token: item.token,
    // name: item.name,
    // symbol: item.symbol,
    // lifeTime: lifeTimeStr,
    // decimals: item.decimals,
    // volume24hUSD: item.volume24hUSD,
    // logUri: item.logUri,
    // price: item.price,
    // liquidityUsd: item.initLiquidityUsd
    
    let new_title = `🚀 Trending Token
\n`

    let json_result: Array<any> = []
    
    let json_header = 
        [
            json_buttonItem(itemData, MyOptionCode.SUB_TRENDING_TOKEN_SETTING, `✅ Trending Token`),
        ]
    json_result.push(json_header)
    
    // console.log("[json_new_pairs_menu] session addr = ", session.addr)

    for(let i = 0; pairs && i < pairs.length; i++)
    // for(let i = pairs.length - 1; i >= 0; i--)
    // for(let i = idx_0; b_webSock ? i < pairs.length : i >= 0; b_webSock ? i++ : i--)
    {
        const item = pairs[i]
        
        const poolInfo: any = await dexscreenerAPI.getPoolInfo(item.token, session.lastUsedChainMode)
        // console.log("----------poolinfo", poolInfo)

        let mc = item.mcUsd ? item.mcUsd : poolInfo ? poolInfo.mc : 0;
        let liquidity = item.initLiquidityUsd ? item.initLiquidityUsd : poolInfo ? poolInfo.liquidity : 0;
        let volume24h = item.volume24hUSD
        let price = item.price

        new_title += `<a href="${poolInfo ? poolInfo.dexURL : ''}">📈${item.symbol}</a> | ${item.name}
<code>${item.token}</code>
• Price: $${utils.roundDecimal(price, 8)}
• Market Cap: $${utils.roundBigUnit(Number(mc), 2)}
• Volume24h: ${utils.roundBigUnit(Number(volume24h), 2)}
• Liquidity: $${utils.roundBigUnit(Number(liquidity), 2)}
\n`
// • 🟢 LIVE Quick Buy
    }
    
    let end_item = 
        [
            json_buttonItem(itemData, MyOptionCode.BUY_SUB_BACK_SETTING, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.SUB_TRENDING_TOKEN_REFRESH, "🔄 Refresh"),
        ]
    json_result.push(end_item)

    // if (session.addr == "") {
        return { title: new_title, options: json_result };
    // }
};

export const json_sell_token_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return "";
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const itemData = `${sessionId}`;

    const swaplimit:number = user.buySwapLimit
    const buySolIdx:number = user.buySolIdx
    const buySlipIdx:number = user.buySlippageIdx

    let tokens: any = await database.selectTokens({chatid: sessionId, chainID: user.lastUsedChainMode})
    // console.log("token = ", tokens)
    if(tokens.length == 0)
    {
        console.log(`[${user.username}] : There is no tokens to sell in database`)
        return ""
    }

    const depositWallet = await multichainAPI.getDepositWalletBalance(database, sessionId)

    for(let i =0; i < tokens.length; i++ )
    {
        let cur_token = tokens[i]
        let cur_tokenBalance: number = await multichainAPI.getTokenBalanceOfWallet(depositWallet, cur_token.addr, cur_token.decimal, user.lastUsedChainMode)

        if (cur_tokenBalance > 0){
            // session.addr = cur_token.addr            
            console.log(`[${user.username}] : In DepositWallet Token addr = ${cur_token.addr}, tokenbalane=${cur_tokenBalance}`)
            utils_base.sendMsg(sessionId, 'Sell is OK')
            // break
        }
        else{
            console.log(`[${user.username}] : RemoveToken ${cur_token.symbol} balance = ${cur_tokenBalance}, addr = ${cur_token.addr}`)
            let ret = await database.removeToken({chatid:sessionId, addr:cur_token.addr, chainID: user.lastUsedChainMode})
            if (ret){
                console.log(`[${user.username}] [Sell Token Menu]: ✅ successfuly token [${cur_token.symbol}] deleted - 1`)
            }               
        }
    }

    // Retry fetching token list in DB
    tokens = await database.selectTokens({chatid: sessionId, chainID: user.lastUsedChainMode})
    
    let limitRestAmount = 0;

    // switch (user.lastUsedChainMode)
    // {
    //     case afx.MainChain.SOLANA_NET:
    //         limitRestAmount = constants.LIMIT_REST_SOL_AMOUNT
    //         break
    //     case afx.MainChain.BASE_NET:
    //         limitRestAmount = 0.001
    //         break
    //     case afx.MainChain.ETHEREUM_NET:
    //         limitRestAmount = 0.001
    //         break
    //     case afx.MainChain.BSC_NET:
    //         limitRestAmount = 0.005
    //         break
    //     case afx.MainChain.TON_NET:
    //         limitRestAmount = 0.5
    //         break
    // }

    // if (depositWallet.nativeCurrencyBalance <= limitRestAmount * 2)
    // {
    //     console.log(`[${user.username}] : There is no enough ${afx.get_quote_name(user.lastUsedChainMode).toUpperCase()} in deposit wallet`)
    //     return ""
    // }


    let json_result: Array<any> = []

    let new_title: string = `🚀 Select a token to sell ${tokens.length}/${tokens.length}
        
💳 Wallet:\n<code>${depositWallet.depositPubKey}</code>
💰 Balance: ${depositWallet.depositBalance} : ($${depositWallet.depositUSDTBalance})\n`

// Token Info: ${token.symbol}/${token.baseSymbol} <a href="${poolInfo.dexURL}">📈</a>
// <code>${token.addr}</code>
// 💵 Price: ${poolInfo.price} $
// ⚡ Price Impact: ${poolInfo.priceChange} %
// ${tokenBalance ? `\n💡 Your position:
// ${utils.roundSolUnit(token.autoBuyAmount, 2)}/${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : ``}\`


    // const tokenAccounts: any = await utils.getWalletTokenAccount(new PublicKey(depositWallet.depositPubKey), false)
    // for (let tokenAccount of tokenAccounts)
    for (let token of tokens)
    {
        // let b_exist: Boolean = false;
        // for (let tokenAccount of tokenAccounts)
        // {
        //     const addr: string = tokenAccount.accountInfo.mint.toString()
        //     if (addr == token.addr)
        //     {
        //         b_exist = true;
        //         break
        //     }
        // }

        // if (!b_exist) continue

        // const addr: string = tokenAccount.accountInfo.mint.toString()
        // const token: any = await database.selectToken({chatid:sessionId, addr: addr})
        // if(!token) continue

        const poolInfo: any = await dexscreenerAPI.getPoolInfo(token.addr, user.lastUsedChainMode)
        if (!poolInfo) {
            console.log(`[${user.username}] ====== >>>>> [Sell Token Menu] : pair is not exist (${token.addr})`)
            console.log(`[${user.username}] [Sell Token Menu] >>>>> RemoveToken ${token.symbol} addr = ${token.addr}`)
            let ret = await database.removeToken({chatid:sessionId, addr:token.addr, chainID: user.lastUsedChainMode})
            if (ret){
                console.log(`[${user.username}] : [Sell Token] ✅ successfuly token [${token.symbol}] deleted - 2`)
            }         

            continue
        }
            

        const { exist, symbol, decimal }: any = await multichainAPI.getTokenInfo(token.addr, user.lastUsedChainMode)
        const token_balance: number =  await multichainAPI.getTokenBalanceOfWallet(depositWallet, token.addr, decimal, user.lastUsedChainMode)

        let new_item = 
        [
            json_buttonTokenItem(itemData, MyOptionCode.MAIN_SELL_MENU, poolInfo.name, symbol),            
        ]

        json_result.push(new_item)

        new_title += `\n• ${symbol} — ${utils.roundDecimal(token_balance, 3)} : ($${utils.roundDecimal(Number(token_balance * poolInfo.price).valueOf(), 4)})`
    }

    const end_item = 
    [
        json_buttonItem(itemData, MyOptionCode.SELL_TOKEN_BACK_SETTING, "🔙 Back"),
        json_buttonItem(itemData, MyOptionCode.SELL_TOKEN_REFRESH, "🔄 Refresh"),
    ]

    json_result.push(end_item)

    // if (session.addr == "") {
        return { title: new_title, options: json_result};
    // }
};

export const json_reg_sell = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const user: any = await database.selectUser({ chatid: sessionId })

    const tokens: any = await database.selectTokens({chatid: sessionId})

    let tokenBalance: number = 0;
    let token:any = undefined;

    const depositWallet = await utils.getWalletFromPrivateKey(user.depositWallet)
    for(let i =0; i < tokens.length; i++ )
    {
        let cur_token = tokens[i]
        let cur_tokenBalance:number = await utils.getWalletTokenBalance(depositWallet, cur_token.addr, cur_token.decimal )
        if (cur_tokenBalance > 0.01){
            token = cur_token
            tokenBalance = cur_tokenBalance
            session.addr = cur_token.addr
            
            console.log(`addr = ${token.addr}, tokenbalane=${tokenBalance}`)
            break
        }
        else{//Angel token ???
            let ret = await database.removeToken({chatid:sessionId, addr:cur_token.addr})
            if (ret){
                console.log(`successfuly token[${cur_token.symbol}] deleted`)
            }               
        }
    }
    
    const balance: number = await utils.getWalletSOLBalance(depositWallet)

    const itemData = sessionId

    if(token != undefined && token.addr && tokenBalance > 0){
        const title = `💰 Your Wallet:

Address: <code>${depositWallet.publicKey}</code>
Balance: ${utils.roundSolUnit(balance, 2)}

Token Info: ${token.symbol}/${token.baseSymbol}
<code>${token.addr}</code>
${tokenBalance ? `\n💡 Your position:
${utils.roundSolUnit(token.autoBuyAmount, 2)}/${utils.roundBigUnit(tokenBalance, 2)} ${token.symbol}\n` : `\n`}
Sell limit
    Take Profit: ${token.takeProfit}
    Stop Loss:   ${token.stopLoss}
`;

        const json_manual = [
            [
                json_buttonItem(itemData, OptionCode.MAIN_REG_SELL_SWITCH_MODE, "♻️ Switch To Auto Mode"),
            ],
            [
                json_buttonItem(
                    itemData,
                    OptionCode.MAIN_SELL_X,
                    `💠 Sell X Token`
                ),
            ],
            [
                json_buttonItem(itemData, OptionCode.MAIN_SELL_25, `💠 25%`),
                json_buttonItem(itemData, OptionCode.MAIN_SELL_50, `💠 50%`),
                json_buttonItem(itemData, OptionCode.MAIN_SELL_100, `💠 100%`),
            ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
            //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
            // ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_RISK_MANAGE, `🧶 Risk Management`),
            //     json_buttonItem(itemData, OptionCode.MAIN_SET_PRIORITY, `⚜️ Priority (${token.priority})`),
            //     json_buttonItem(itemData, OptionCode.MAIN_SET_SLIPPAGE, `🎚️ Slippage ${token.slippage}%`),
            // ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
            //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
            // ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_RISK_TAKE_PROFIT, `🧶 Set Take Profit`),
            //     json_buttonItem(itemData, OptionCode.MAIN_RISK_STOP_LOSS, `⚜️ Set Stop Loss`),
            // ],
            [
                json_buttonItem(itemData, OptionCode.MAIN_REG_SELL_REFRESH, "🔄 Refresh"),
                json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
            ],
        ]

        const json_auto = [
            [
                json_buttonItem(
                    itemData,
                    OptionCode.MAIN_REG_SELL_SWITCH_MODE,
                    `♻️ Switch To Manual Mode`
                ),
            ],
            [
                json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_SELL, token.isAutoSell ? `🟢 Auto Sell (${token.autoSellAmount}%)` : `🔴 Auto Sell (${token.autoSellAmount}%)`),
                json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_X, `💠 Sell X Token`),
            ],
            [
                json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_25, `💠 25%`),
                json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_50, `💠 50%`),
                json_buttonItem(itemData, OptionCode.MAIN_SETTING_AUTO_SELL_100, `💠 100%`),
            ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_SWITCH_AUTO_DETECT, user.isAutoDetect ? `🟢 Raydium Pool Detection` : `🔴 Raydium Pool Detection`),
            //     json_buttonItem(itemData, OptionCode.MAIN_SETTING_DETECTION, '⚙️ Detection Setting'),
            // ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_RISK_MANAGE, `🧶 Risk Management`),
            //     json_buttonItem(itemData, OptionCode.MAIN_SET_PRIORITY, `⚜️ Priority (${token.priority})`),
            //     json_buttonItem(itemData, OptionCode.MAIN_SET_SLIPPAGE, `🎚️ Slippage ${token.slippage}%`),
            // ],
            // [
            //     json_buttonItem(itemData, OptionCode.MAIN_WALLET_MANAGE, `💳 Wallet Management`),
            //     json_buttonItem(itemData, OptionCode.MAIN_HELP, "📕 Help"),
            // ],
            [
                json_buttonItem(itemData, OptionCode.MAIN_RISK_TAKE_PROFIT, `🧶 Set Take Profit`),
                json_buttonItem(itemData, OptionCode.MAIN_RISK_STOP_LOSS, `⚜️ Set Stop Loss`),
            ],
            [
                json_buttonItem(itemData, OptionCode.MAIN_REG_SELL_REFRESH, "🔄 Refresh"),
                json_buttonItem(itemData, OptionCode.CLOSE, "❎ Close"),
            ],
        ]

        return { title: title, options: token.mode === constants.SWAP_MODE.MANUAL ? json_manual : json_auto };
    }
    else{
        const title = `You do not have any tokens yet! Start trading in the Buy menu.`

        // const itemData = sessionId;
        const json = [
            [
                // json_buttonItem(itemData, OptionCode.MAIN_REFRESH, "🔄 Refresh"),
                json_buttonItem(sessionId, OptionCode.CLOSE, "❎ Close"),
            ],
        ];

        return { title: title, options: json };
    }
};

export const json_withdraw_chain_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const title = `🚀 Select the network to withdraw from`;

    const itemData = sessionId;

    let json_result: Array<any> = [];

    let json_sol    = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_SOLANA_MODE, "Solana") ]]
    // let json_evm    = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_ETHEREUM_MODE, "Ethereum")]]
    let json_evm    = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_ETHEREUM_MODE, "Ink")]]
    let json_base   = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_BASE_MODE, "Base") ]]
    let json_bsc    = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_BSC_MODE, "Bsc") ]]
    let json_ton    = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_TON_MODE, "Ton") ]]
    let json_back   = [[ json_buttonItem(itemData, MyOptionCode.WITHDRAW_BACK, "🔙 Back") ]]

    switch (session.lastUsedChainMode)
    {
        case afx.MainChain.SOLANA_NET:
            json_result = [...json_result, ...json_sol]
            break
        case afx.MainChain.ETHEREUM_NET:
            json_result = [...json_result, ...json_evm]
            break
        case afx.MainChain.BASE_NET:
            json_result = [...json_result, ...json_base]
            break
        case afx.MainChain.BSC_NET:
            json_result = [...json_result, ...json_bsc]
            break
        case afx.MainChain.TON_NET:
            json_result = [...json_result, ...json_ton]
            break
    }

    json_result = [...json_result, ...json_back]
    return { title: title, options: json_result };
};

export const json_withdraw_token_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const depositWallet = await multichainAPI.getDepositWalletBalance(database, sessionId)

    let title = `🚀 Select a token to withdraw ${afx.get_chain_name(session.lastUsedChainMode)} 
\n`;

    let quoteName = afx.get_quote_name(session.lastUsedChainMode).toUpperCase();

    if(depositWallet.nativeCurrencyBalance <= 0)
    {
        console.log(`[json_withdraw_token_menu] -> no ${quoteName} balance in your wallet`)
        title += `⚠️ No ${quoteName} balance in your wallet`
    }
    else
        title += `⬩ ${quoteName} — ${depositWallet.depositBalance} — Price: $${depositWallet.depositUSDTBalance}`
    

    console.log(`----------- json_withdraw_token_menu => balance = ${depositWallet.nativeCurrencyBalance}, ${session.lastUsedChainMode}`)

    const itemData = sessionId;
    
    let json_default = [
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_TOKEN_NET_MODE, quoteName),            
        ],
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_TOKEN_BACK, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_TOKEN_REFRESH, "🔄 Refresh"),
        ],
    ];

    let json_again = [        
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_TOKEN_BACK, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_TOKEN_REFRESH, "🔄 Refresh"),
        ],
    ];

    return { title: title, options: depositWallet.nativeCurrencyBalance > 0 ?  json_default : json_again };
};

export const json_withdraw_wallet_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    // const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    // const balance: number = await utils.getWalletSOLBalance(depositWallet)

    const depositWallet = await multichainAPI.getDepositWalletBalance(database, sessionId)

    // const solPrice: number = await utils.getSOLPrice();

    let quoteName = afx.get_quote_name(session.lastUsedChainMode);

    const title = `🚀 Withdraw ${quoteName} — (${afx.get_chain_name(session.lastUsedChainMode).toUpperCase()}) 

💳 My Wallet:
<code>${depositWallet.depositPubKey}</code>
Balance: ${depositWallet.depositBalance}

⬩ Withdraw Address
<code>${user.withdrawWallet}</code>`;

    const itemData = sessionId;
    let json_default = [
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_50_PERCENT, user.withdrawIdx == 1 ? `✅ 50 %` :`50 %`),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_100_PERCENT, user.withdrawIdx == 2 ? `✅ 100 %` : `100 %`),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_X_PERCENT, user.withdrawIdx == 3 ? `✅ ${user.withdrawAmount}%` : `X %`),            
        ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.WITHDRAW_X_SOL, `X ${afx.get_quote_name()}`),            
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_WALLET_ADDRESS, `Set Withdrawal Address`),            
        ],
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_WALLET_BACK, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_WALLET_REFRESH, "🔄 Refresh"),
        ],
    ];

    let json_withdraw = [
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_50_PERCENT, user.withdrawIdx == 1 ? `✅ 50 %` :`50 %`),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_100_PERCENT, user.withdrawIdx == 2 ? `✅ 100 %` : `100 %`),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_X_PERCENT, user.withdrawIdx == 3 ? `✅ ${user.withdrawAmount}%` : `X %`),
        ],
        // [
        //     json_buttonItem(itemData, MyOptionCode.WITHDRAW_X_SOL, `X ${afx.get_quote_name()}`),            
        // ],
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_WALLET_TO, `To: ${user.withdrawWallet}`),            
        ],
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_OK, "WITHDRAW"),
        ],
        [
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_WALLET_BACK, "🔙 Back"),
            json_buttonItem(itemData, MyOptionCode.WITHDRAW_WALLET_REFRESH, "🔄 Refresh"),
        ],
    ];

    return { title: title, options: (session.withdrawWallet == "") ? json_default : json_withdraw};
};

export const json_deposit_wallet = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const depositInfo: any = await multichainAPI.getDepositWalletBalance(database, sessionId)
    if (!depositInfo) return null

    let chainName = afx.get_chain_name(session.lastUsedChainMode).toUpperCase()

    const title = `⚠️ Security Warning ⚠️

Are you sure you want to proceed? This action is irreversible and could have significant consequences:

⬩ Importing a new private key will overwrite your existing private key, erasing your current wallet within ${chainName} bot.
⬩ You will permanently lose access to your current ${chainName} bot wallet unless you have your private key securely backed up.
⬩ Without a backup of your existing private key, you will not be able to recover your old ${chainName} bot wallet.
⬩ ${chainName} Bot will NEVER DM YOU, call you, or ask you for your private key in ANY way. Anyone who does is a scammer.
⬩ ${chainName} Bot cannot recover your private key for you.

💰 Your Wallet:

⬩ Address: <code>${depositInfo.depositPubKey}</code>
⬩ Balance: ${depositInfo.depositBalance} ($ ${depositInfo.depositUSDTBalance})

If you do not back up your private key your wallet and all assets will be lost.
`;

    const itemData = sessionId;
    let json = [
        [json_buttonItem(itemData, OptionCode.MAIN_WALLET_REFRESH, "🔄 Refresh")],
        [
            json_buttonItem(itemData, MyOptionCode.MAIN_WALLET_IMPORT, "📥 Import Key"),
            json_buttonItem(itemData, OptionCode.MAIN_WALLET_EXPORT, "📤 Export Key"),
        ],
        [json_buttonItem(sessionId, OptionCode.CLOSE, "❎ Close")],
    ];
    return { title: title, options: json };
};

export const json_referral_menu = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const referrals: any = await database.countUsers({referredBy:sessionId})

    // console.log(`+++++++++++++++++ ${referrals}`)
    const rewards:any = await database.selectRewards({chatid : sessionId})
    let totalRewards = 0
    rewards.forEach((user: any) => {
        totalRewards += user.amount        
    });

    let curEthPrice= await utils_base.getEthPrice()
    totalRewards *= curEthPrice

    // const rewards: any = await multichainAPI.getReferralWalletBalance(database, sessionId)
    // totalRewards = rewards.referralUSDTBalance

    let quoteName = afx.get_quote_name(user.lastUsedChainMode).toUpperCase()

    const title = `🎁 Your Referral Dashboard

🔗 Your referral link : 
<code>${user.referralLink}</code>

👭 Referrals : ${referrals}
💸 Total earnings : $ ${utils_base.roundDecimal(totalRewards, 5)}

You will receive rewards directly to your wallet as soon as the users you referred complete transactions

Refer your friends and earn 30% of their fees in the first month, 20% in the second and 10% forever! ${user.lastUsedChainMode === afx.MainChain.SOLANA_NET ? '\n<i>To receive referral rewards, you must activate your receiving wallet by depositing a small amount of SOL into your current wallet even it is just 1 lamport</i>\n' : ''}

Maximize your earnings potential by sharing your referral link!

Note: You should surely send buy & sell transaction more than ${user.lastUsedChainMode === afx.MainChain.SOLANA_NET ? `0.3` :  `0.02` }${quoteName} because of tax & referral fee
`;

    const itemData = sessionId;
    let json = [
        // [json_buttonItem(itemData, MyOptionCode.REFERRAL_SUB_REWARD_WALLET, "Rewards wallet: ")],
        [json_buttonItem(sessionId, OptionCode.CLOSE, "❎ Close")],
    ];
    return { title: title, options: json };
};

export const json_risk_management = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })

    const title = `⚙️ Risk Management:

🥇 Take Profit amount: ${token.takeProfit}%
🥉 Stop Loss amount: ${token.stopLoss}%`;

    const itemData = sessionId;
    let json = [
        [
            json_buttonItem(
                itemData,
                OptionCode.MAIN_RISK_TAKE_PROFIT,
                "🥇 Set Take Profit Amount"
            ),
        ],
        [
            json_buttonItem(
                itemData,
                OptionCode.MAIN_RISK_STOP_LOSS,
                "🥉 Set Stop Loss Amount"
            ),
        ],
        [json_buttonItem(sessionId, OptionCode.CLOSE, "❎ Close")],
    ];
    return { title: title, options: json };
};
export const json_detection_settings = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const user: any = await database.selectUser({ chatid: sessionId })

    const title = `⚙️ Detection Settings:

🔹 Pool amount to detect: ${user.solDetectionMin} ~ ${user.solDetectionMax} SOL
🔹 Changed percent to detect after launch: ${user.poolChanged}%`


    const itemData = sessionId;
    let json = [
        [
            json_buttonItem(
                itemData,
                OptionCode.MAIN_DETECTION_MINTABLE,
                user.detectMintable ? "🟢 Mintable Token" : "🔴 Mintable Token"
            ),
            json_buttonItem(
                itemData,
                OptionCode.MAIN_DETECTION_LOCKED,
                user.detectLocked ? "🟢 Pool Locked" : "🔴 Pool Locked"
            ),
        ],
        [
            json_buttonItem(
                itemData,
                OptionCode.MAIN_DETECTION_POOL_AMOUNT_CEHCK,
                user.detectSolAmount ? "🟢 Pool Amount Check" : "🔴 Pool Amount Check"
            ),
            json_buttonItem(
                itemData,
                OptionCode.MAIN_DETECTION_CHANGE_PERCENT_CHECK,
                user.detectPoolChanged ? "🟢 Pool Changed Check" : "🔴 Pool Changed Check"
            ),
        ],
        [
            json_buttonItem(
                itemData,
                OptionCode.MAIN_DETECTION_POOL_AMOUNT,
                "Set Pool Amount to Check"
            ),
            json_buttonItem(
                itemData,
                OptionCode.MAIN_DETECTION_CHANGE_PERCENT,
                "Set Change Percent to Check"
            ),
        ],
        [json_buttonItem(sessionId, OptionCode.CLOSE, "❎ Close")],
    ];
    return { title: title, options: json };
}

export const json_help = async (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    let scanUrl = ""
    switch (session.lastUsedChainMode)
    {
        case afx.MainChain.SOLANA_NET:
            scanUrl = "solscan.io"
            break
        case afx.MainChain.ETHEREUM_NET:
            scanUrl = "explorer.inkonchain.com"
            break
        case afx.MainChain.BASE_NET:
            scanUrl = "basescan.org"
            break
        case afx.MainChain.BSC_NET:
            scanUrl = "bscscan.com"
            break
        case afx.MainChain.TON_NET:
            scanUrl = "tonscan.org"
            break
    }

    const title = `📕 Help:
How do I use ${process.env.BOT_TITLE}?
    
Where can I find my referral code?
Open the /start menu and click 💰Referrals.
    
My transaction timed out. What happened?
Transaction timeouts can occur when there is heavy network load or instability. ${session.lastUsedChainMode == afx.MainChain.SOLANA_NET ? 'This is simply the nature of the current Solana network.' : ''}
    
What are the fees for using ${process.env.BOT_TITLE}?
Transactions through ${process.env.BOT_TITLE} incur a fee of 1%, or 0.9% if you were referred by another user. We don't charge a subscription fee or pay-wall any features.
    
My net profit seems wrong, why is that?
The net profit of a trade takes into consideration the trade's transaction fees. Confirm the details of your trade on ${scanUrl} to verify the net profit.
    
Additional questions or need support?
Join our Telegram group https://t.me/SolTrading000_bot and one of our admins can assist you.

${constants.BOT_FOOTER_DASH}`;

    let json = [[json_buttonItem(sessionId, OptionCode.HELP_BACK, "🔙 Back to Main")]];
    return { title: title, options: json };
};

export const json_confirm = async (
    sessionId: string,
    msg: string,
    btnCaption: string,
    btnId: number,
    itemData: string = ""
) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }

    const title = msg;

    let json = [
        [
            json_buttonItem(sessionId, OptionCode.CLOSE, "❎ Close"),
            json_buttonItem(itemData, btnId, btnCaption),
        ],
    ];
    return { title: title, options: json };
};

export const openConfirmMenu = async (
    sessionId: string,
    msg: string,
    btnCaption: string,
    btnId: number,
    itemData: string = ""
) => {
    const menu: any = await json_confirm(
        sessionId,
        msg,
        btnCaption,
        btnId,
        itemData
    );
    if (menu) {
        await openMenu(sessionId, btnId, menu.title, menu.options);
    }
};

export const createSession = async (
    chatid: string,
    username: string,
    // type: string
) => {
    let session: any = {};

    session.chatid = chatid;
    session.username = username;
    session.addr = "";
    session.b_start = false
    
    session.lastUsedChainMode = afx.get_chain_mode()

    session.referralLink = `https://t.me/${myInfo.username}?start=ref_${utils.encodeChatId(chatid)}`

    console.log(`[${session.username}] ----------->>>>>> ref link = ${session.referralLink}`)

    await setDefaultSettings(session);
    
    sessions.set(session.chatid, session);
    await showSessionLog(session);

    currentSession = session
    
    return session;
};

export async function showSessionLog(session: any) {
    sendText(session.chatid, `${session.username} : `)
    if (session.type === "private") {
        console.log(
            `@${session.username} user${session.wallet
                ? " joined"
                : "'s session has been created (" + session.chatid + ")"
            }`
        );
    } else if (session.type === "group") {
        console.log(
            `@${session.username} group${session.wallet
                ? " joined"
                : "'s session has been created (" + session.chatid + ")"
            }`
        );
    } else if (session.type === "channel") {
        console.log(
            `@${session.username} channel${session.wallet ? " joined" : "'s session has been created"
            }`
        );
    }
}

export const defaultConfig = {
    vip: 0,
};

export const setDefaultSettings = async (session: any) => {
    session.timestamp = new Date().getTime();
         
    const ethDepoWallet = utils_base.generateNewWallet();
    // session.baseDepositWallet = utils.encryptPKey(ethDepoWallet.privateKey)
    session.baseDepositWallet = ethDepoWallet?.privateKey

    const ethRefWallet = utils_base.generateNewWallet();
    // session.baseReferralWallet = utils.encryptPKey(ethRefWallet.privateKey)
    session.baseReferralWallet = ethRefWallet?.privateKey

    console.log(`======================================================================`)
    console.log(`[${new Date().toISOString()}] : [${session.username}] ====== {`)
    console.log(`       chatid          = ${session.chatid}`)
    console.log(`       evmDepositWallet   = ${session.baseDepositWallet}`)
    console.log(`       evmReferralWallet  = ${session.baseReferralWallet}`)
    console.log(`} ===========`)

    await database.addWallet(session)

    // for (let i = 0; i < constants.MAX_WALLET_SIZE; i++) {
    //     const botWallet = utils.generateNewWallet();
    //     await database.addWallet({ chatid: session.chatid, prvKey: botWallet?.secretKey })
    // }
};

export let _command_proc: any = null;
export let _callback_proc: any = null;
export async function init(command_proc: any, callback_proc: any) {
    bot = new TelegramBot(process.env.BOT_TOKEN as string, {
        polling: true,
    });

    await bot.getMe().then((info: TelegramBot.User) => {
        myInfo = info;
        console.log("=========>>>>>>>> bot.getMe() : ", myInfo.username)
    });

    bot.on("message", async (message: any) => {
        // console.log(`========== message ==========`)
        // console.log(message)
        // console.log(`=============================`)

        const msgType = message?.chat?.type;
        if (msgType === "private") {
            privateBot.procMessage(message, database);
        } else if (msgType === "group" || msgType === "supergroup") {
        } else if (msgType === "channel") {
        }
    });

    bot.on(
        "callback_query",
        async (callbackQuery: TelegramBot.CallbackQuery) => {
            // console.log('========== callback query ==========')
            // console.log(callbackQuery)
            // console.log('====================================')

            const message = callbackQuery.message;

            if (!message) {
                return;
            }

            const option = JSON.parse(callbackQuery.data as string);
            let chatid = message.chat.id.toString();
            
            // console.log("[callback_query] = ", callbackQuery.data)

            executeCommand(
                chatid,
                message.message_id,
                callbackQuery.id,
                option
            );
        }
    );

    _command_proc = command_proc;
    _callback_proc = callback_proc;

    await database.init();
    const users: any = await database.selectUsers();

	//fastswap.loadPoolKeys()

    console.log("bot init : user count(DB) = ", users.length)

    let loggedin = 0;
    let admins = 0;
    for (const user of users) {
        let session = JSON.parse(JSON.stringify(user));
        session = utils.objectDeepCopy(session, ["_id", "__v"]);

        console.log(`[${new Date().toISOString()}] : session init = `, session.chatid, session.username)
        // console.log(session)

        if (session.depositWallet) {
            loggedin++;
        }

        // console.log(`----db init :=`, session.baseDepositWallet, session.tonDepositWallet)

        let bUpdateWallet = false
        if (session.baseDepositWallet === undefined)
        {
            const ethDepoWallet = utils_base.generateNewWallet();
            // session.baseDepositWallet = utils.encryptPKey(ethDepoWallet.privateKey)
            session.baseDepositWallet = ethDepoWallet?.privateKey

            const ethRefWallet = utils_base.generateNewWallet();
            // session.baseReferralWallet = utils.encryptPKey(ethRefWallet.privateKey)
            session.baseReferralWallet = ethRefWallet?.privateKey
            bUpdateWallet = true
        }

        if (bUpdateWallet)
        {
            await database.updateUser(session);
            await database.addWallet(session)
            console.log(`[${session.username}] Deposit Wallets is updated.`)
        }

        sessions.set(session.chatid, session);
        if (user.isAutoDetect) {
            addUser(session.chatid)
        }
        // showSessionLog(session)

        if (session.admin >= 1) {
            console.log(
                `@${session.username} user joined as ADMIN ( ${session.chatid} )`
            );
            admins++;
        }
    }

    // runDetector() //Angel ???

    console.log(
        `${users.length} users, ${loggedin} logged in, ${admins} admins`
    );
}

export const reloadCommand = async (
    chatid: string,
    messageId: number,
    callbackQueryId: string,
    option: any
) => {
    await removeMessage(chatid, messageId);
    executeCommand(chatid, messageId, callbackQueryId, option);
};

export const hasSOLDepositWallet = async(
    sessionId: string,
    messageId: number
): Promise<boolean> => {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }

    const user: any = await database.selectUser({ chatid: sessionId })
    const depositWallet: any = utils.getWalletFromPrivateKey(user.depositWallet)
    const balance: number = await utils.getWalletSOLBalance(depositWallet)
    
    if(balance <= 0)
    {
        console.log(`[${user.username}] -> no SOL balance in your deposit wallet`)
        return false   
    }

    return true
};

export const executeCommand = async (
    chatid: string,
    _messageId: number | undefined,
    _callbackQueryId: string | undefined,
    option: any
) => {
    const cmd = option.c;
    const id = option.k;

    const session = sessions.get(chatid);
    if (!session) {
        return;
    }

    //stateMap_clear();

    let messageId = Number(_messageId ?? 0);
    let callbackQueryId = _callbackQueryId ?? "";

    const sessionId: string = chatid;
    const stateData: any = { sessionId, messageId, callbackQueryId, cmd };

    // console.log("======stateData", stateData)

    stateData.message_id = messageId
    stateData.callback_query_id = callbackQueryId

    let chainMode = session.lastUsedChainMode

    let replyMsg: any = null
    try {
        if (cmd === MyOptionCode.MAIN_BUY_SETTING) {        
            
            // const flag: boolean = await hasSOLDepositWallet(chatid, messageId);
            const flag: boolean = await multichainAPI.isHasBalanceOfDepositWallet(database, chatid)

            if(!flag)
            {
                let depositAmount = 0.002                

                let quoteName = afx.get_quote_name(chainMode).toUpperCase()
                const msg = `⚠️ Sorry, no enough ${quoteName} in your wallet, deposit ${depositAmount} ${quoteName} at least and try again`;
                sendInfoMessage(chatid, msg);
                return
            }

            const msg = `Please enter a token address to buy`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_MAIN_BUY,
                stateData
            );
        } else if (cmd === MyOptionCode.MAIN_SELL_SETTING) {
            const menu: any = await json_sell_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);
            if (menu == "")
            {
                const msg = `⚠️ Sorry, no tokens to sell`;
                sendMessage(chatid, msg);
                return
            }

            if(messageId === 0)//command:  /sell
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.MAIN_POSITION_SETTING) {
            const menu: any = await json_position_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);
            if (menu == "")
            {
                const msg = `⚠️ Sorry, no tokens to manage`;
                sendMessage(chatid, msg);
                return
            }

            if(messageId === 0)//command:  /positions
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.MAIN_NEW_PAIRS_SETTING) {
            const menu: any = await json_new_pairs_menu(chatid);
            // let title: string = await getNewPairsMenuMessage(chatid);

            if(messageId === 0)//command:  /positions
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.SUB_NEW_PAIRS_SETTING) {
            await botLogic.setNewPairsUpcomingLaunch(chatid, true)
            const menu: any = await json_new_pairs_menu(chatid);
            // let title: string = await getNewPairsMenuMessage(chatid);

            if(messageId === 0)//command:  /positions
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.SUB_UPCOMING_LAUNCHES_SETTING) {
            await botLogic.setNewPairsUpcomingLaunch(chatid, false)
            const menu: any = await json_new_pairs_menu(chatid);
            // let title: string = await getNewPairsMenuMessage(chatid);

            if(messageId === 0)//command:  
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.SUB_NEW_PAIRS_REFRESH) {
            const menu: any = await json_new_pairs_menu(chatid);
            // let title: string = await getNewPairsMenuMessage(chatid);

            if(messageId === 0)//command:  /positions
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.MAIN_TRENDING_TOKEN_SETTING || cmd === MyOptionCode.SUB_TRENDING_TOKEN_REFRESH ) {
            const menu: any = await json_trending_token_menu(chatid);
            // let title: string = await getNewPairsMenuMessage(chatid);

            if(messageId === 0)//command:  /trending
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.MAIN_WITHDRAW_SETTING) {
            const menu: any = await json_withdraw_chain_menu(chatid);
            // let title: string = await getNewPairsMenuMessage(chatid);

            if(messageId === 0)//command:  /withdraw
                await openMenu(chatid, cmd, menu.title, menu.options);    
            else
                await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === MyOptionCode.MAIN_MENU) {
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, title, menu.options);
        } else  if (cmd === MyOptionCode.MAIN_BUY_MENU) {
            const menu: any = await json_buy_menu(chatid);
            let title: string = await getBuyMenuMessage(chatid);

            await openMenu(chatid, cmd, title, menu.options);
        } else  if (cmd === MyOptionCode.MAIN_SELL_MENU) {

            const tokenSymbol = option.s;
            // console.log("----------Sell menu = ", tokenSymbol)

            const token: any = await database.selectToken({chatid:sessionId, symbol:tokenSymbol, chainID: chainMode})
            if (!token)
            {
                const msg = `⚠️ Sorry, please exactly select a token to sell`;
                sendMessage(chatid, msg);
                return
            }

            session.addr = token.addr
            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === MyOptionCode.MAIN_REFRESH) {
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.BUY_SUB_SWAP_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySwapLimitSetting(chatid, 1)
            const menu: any = await json_buy_menu(chatid);
            let title: string = await getBuyMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.BUY_SUB_LIMIT_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySwapLimitSetting(chatid, 2)
            const menu: any = await json_buy_menu(chatid);
            let title: string = await getBuyMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.BUY_SUB_05_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySolAmount(chatid, 1)
            const user: any = await database.selectUser({ chatid: sessionId })
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
            token.buyAmount = user.stBuyLeftAmount
            await token.save()
            // const menu: any = await json_buy_menu(chatid);
            // let title: string = await getBuyMenuMessage(chatid);
            // await switchMenu(chatid, messageId, title, menu.options);
            await botLogic.buy(chatid, token.addr, token.buyAmount, async (msg: string)=>{
                // await sendMessageSync(session.chatid, msg);
                console.log(`[${session.username}]`, msg)
                const menu: any = await json_buy_success_menu(chatid);
                // let title: string = await getBuyMenuMessage(chatid);
                await openMenu(chatid, messageId, msg, menu.options);
            })
        }
        else if (cmd === MyOptionCode.BUY_SUB_1_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySolAmount(chatid, 2)
            const user: any = await database.selectUser({ chatid: sessionId })
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
            token.buyAmount = user.stBuyRightAmount
            await token.save()
            // const menu: any = await json_buy_menu(chatid);
            // let title: string = await getBuyMenuMessage(chatid);
            // await switchMenu(chatid, messageId, title, menu.options);
            await botLogic.buy(chatid, token.addr, token.buyAmount, async (msg: string)=>{
                // await sendMessageSync(session.chatid, msg);
                console.log(`[${session.username}]`, msg)
                const menu: any = await json_buy_success_menu(chatid);
                // let title: string = await getBuyMenuMessage(chatid);
                await openMenu(chatid, messageId, msg, menu.options);
            })
        }
        else if (cmd === MyOptionCode.BUY_SUB_3_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySolAmount(chatid, 3)
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
            token.buyAmount = 3
            await token.save()
            const menu: any = await json_buy_menu(chatid);
            let title: string = await getBuyMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.BUY_SUB_5_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySolAmount(chatid, 4)
            const user: any = await database.selectUser({ chatid: sessionId })
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: user.lastUsedChainMode })
            token.buyAmount = user.stBuyLeftAmount
            await token.save()

            await multichainSwap.buy(token.addr, database, chatid, 
                async (msg: string)=>{
                    // await sendMessageSync(session.chatid, msg);
                    console.log(`[${session.username}] [multichainBuy]`, msg)
                    const menu: any = await json_buy_success_menu(chatid);
                    // let title: string = await getBuyMenuMessage(chatid);
                    await openMenu(chatid, messageId, msg, menu.options);
                },
                async (param: any) => {
                    console.log(`[${session.username}] [multichainBuy] : = ${param.text}`)
                     // const menu: any = await json_buy_success_menu(chatid);
                    // let title: string = await getBuyMenuMessage(chatid);
                    let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                    const menu: any = await json_buy_success_menu(chatid);
                    
                    await switchMenu(chatid, messageId, param.text, param.success ? menu.options : json);        
                }
            )

            // const menu: any = await json_buy_menu(chatid);
            // let title: string = await getBuyMenuMessage(chatid);
            // await switchMenu(chatid, messageId, title, menu.options);
            // await botLogic.buy(chatid, token.addr, token.buyAmount, async (msg: string)=>{
            //     // await sendMessageSync(session.chatid, msg);
            //     console.log(`[${session.username}]`, msg)
            //     const menu: any = await json_buy_success_menu(chatid);
            //     // let title: string = await getBuyMenuMessage(chatid);
            //     await openMenu(chatid, messageId, msg, menu.options);
            // })
        }
        else if (cmd === MyOptionCode.BUY_SUB_10_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySolAmount(chatid, 5)
            const user: any = await database.selectUser({ chatid: sessionId })
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr })
            token.buyAmount = user.stBuyRightAmount
            await token.save()

            await multichainSwap.buy(token.addr, database, chatid, 
                async (msg: string)=>{
                    // await sendMessageSync(session.chatid, msg);
                    console.log(`[${session.username}] [multichainBuy]`, msg)
                    const menu: any = await json_buy_success_menu(chatid);
                    // let title: string = await getBuyMenuMessage(chatid);
                    await openMenu(chatid, messageId, msg, menu.options);
                },
                async (param: any) => {
                    console.log(`[${session.username}] [multichainBuy] : = ${param.text}`)
                     // const menu: any = await json_buy_success_menu(chatid);
                    // let title: string = await getBuyMenuMessage(chatid);
                    let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                    const menu: any = await json_buy_success_menu(chatid);
                    
                    await switchMenu(chatid, messageId, param.text, param.success ? menu.options : json);        
                }
            )

            // const menu: any = await json_buy_menu(chatid);
            // let title: string = await getBuyMenuMessage(chatid);
            // await switchMenu(chatid, messageId, title, menu.options);
            // await botLogic.buy(chatid, token.addr, token.buyAmount, async (msg: string)=>{
            //     // await sendMessageSync(session.chatid, msg);
            //     console.log(`[${session.username}]`, msg)
            //     const menu: any = await json_buy_success_menu(chatid);
            //     // let title: string = await getBuyMenuMessage(chatid);
            //     await openMenu(chatid, messageId, msg, menu.options);
            // })
        }
        else if (cmd === MyOptionCode.BUY_SUB_X_SETTING) {
            // await removeMessage(chatid, messageId)
            replyMsg = await sendMessage(
                stateData.sessionId,
                `Please enter ${afx.get_quote_name(chainMode).toUpperCase()} amount`
            );

            // await botLogic.setBuySolAmount(chatid, 6)
            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_BUY_X_SOL,
                stateData
            );
        }
        else if (cmd === MyOptionCode.BUY_SUB_15_SLIPPAGE_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setBuySlipIdx(chatid, 1)
            console.log(`[${session.username}] ========== buy slippage = ${session.stAutoBuySlippage}`)
            await botLogic.setBuySlippage(chatid, session.addr, session.stAutoBuySlippage, chainMode)

            const menu: any = await json_buy_menu(chatid);
            let title: string = await getBuyMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.BUY_SUB_X_SLIPPAGE_SETTING) {
            // await removeMessage(chatid, messageId)
            replyMsg = await sendMessage(
                stateData.sessionId,
                `Please enter buy slippage %`
            );

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_BUY_SLIPPAGE,
                stateData
            );
        }
        else if (cmd === MyOptionCode.BUY_SUB_BUY_SETTING) {
            // await removeMessage(chatid, messageId)
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: chainMode })
            console.log(`[${session.username}] : buy amount = ${token.buyAmount} ${afx.get_quote_name(chainMode).toUpperCase()}`)

            await multichainSwap.buy(token.addr, database, chatid, 
                async (msg: string)=>{
                    // await sendMessageSync(session.chatid, msg);
                    console.log(`[${session.username}] [multichainBuy]`, msg)
                    const menu: any = await json_buy_success_menu(chatid);
                    // let title: string = await getBuyMenuMessage(chatid);
                    await openMenu(chatid, messageId, msg, menu.options);
                },
                async (param: any) => {
                    console.log(`[${session.username}] [multichainBuy] : = ${param.text}`)
                    // const menu: any = await json_buy_success_menu(chatid);
                    // let title: string = await getBuyMenuMessage(chatid);
                    let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                    const menu: any = await json_buy_success_menu(chatid);
                    
                    await switchMenu(chatid, messageId, param.text, param.success ? menu.options : json);    
                }
            )

            // await botLogic.buy(chatid, token.addr, token.buyAmount, async (msg: string)=>{
            //     // await sendMessageSync(session.chatid, msg);
            //     console.log(`[${session.username}]`, msg)
            //     const menu: any = await json_buy_success_menu(chatid);
            //     // let title: string = await getBuyMenuMessage(chatid);
            //     await openMenu(chatid, messageId, msg, menu.options);
            // })
        }
        else if (cmd == MyOptionCode.MAIN_BACK || cmd === MyOptionCode.BUY_SUB_BACK_SETTING || cmd === MyOptionCode.SELL_TOKEN_BACK_SETTING || cmd === MyOptionCode.WITHDRAW_BACK) {
            // await removeMessage(chatid, messageId)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.BUY_SUCCESS_VIEW_TOKENS) {
            // await removeMessage(chatid, messageId)
            // const menu: any = await json_main(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            // await switchMenu(chatid, messageId, title, menu.options);

            await executeCommand(chatid, messageId, undefined, {c: MyOptionCode.MAIN_SELL_SETTING, k:chatid})
        }
        else if (cmd === MyOptionCode.BUY_SUCCESS_SELL) {
            // await removeMessage(chatid, messageId)
            // const menu: any = await json_main(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            // await switchMenu(chatid, messageId, title, menu.options);

            await executeCommand(chatid, messageId, undefined, {c: MyOptionCode.MAIN_SELL_MENU, k:chatid, s: option.s})
        }
        else if (cmd === MyOptionCode.BUY_SUB_REFRESH) {
            // await removeMessage(chatid, messageId)
            if (!session.addr) return
            const menu: any = await json_buy_menu(chatid);
            let title: string = await getBuyMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        } 
        else if (cmd === MyOptionCode.HELP_BACK) {
            await removeMessage(chatid, messageId);
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, title, menu.options);
        } else if (cmd === MyOptionCode.CLOSE) {
            await removeMessage(chatid, messageId);
        } else if (cmd === MyOptionCode.MAIN_HELP) {
            await removeMessage(chatid, messageId);
            const menu: any = await json_help(chatid);

            await openMenu(
                chatid,
                cmd,
                menu.title,
                menu.options
            );
        }
        else if (cmd === MyOptionCode.MAIN_SETTINGS) {
            // await removeMessage(chatid, messageId)
            // await botLogic.buy(chatid, session.addr, 0.25)
            const menu: any = await json_setting_menu(chatid);
            let title: string = await getSettingMenuMessage(chatid);

            if (messageId == 0)// command /settings
                await openMenu(chatid, messageId, title, menu.options);
            else
                await switchMenu(chatid, messageId, title, menu.options);
        } 
        else if (cmd === MyOptionCode.SELL_TOKEN_REFRESH) {
            // await removeMessage(chatid, messageId)
            const menu: any = await json_sell_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_BACK_SETTING) {
            // await removeMessage(chatid, messageId)
            const menu: any = await json_sell_token_menu(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_REFRESH) {
            // await removeMessage(chatid, messageId)
            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_SELL_SETTING) {
            // await removeMessage(chatid, messageId)
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: chainMode })
            
            await multichainSwap.sell(token.addr, database, chatid, async (param: any) => {
                console.log(`[${session.username}] [multichainSell] : = ${param.text}`)
                
                if (param.success)
                {
                    const menu: any = await json_sell_menu(chatid);
                    let title: string = await getSellMenuMessage(chatid);

                    await openMenu(chatid, messageId, title, menu.options);        
                }
                else
                {
                    let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                    // const menu: any = await json_sell_success_menu(chatid);
                    await switchMenu(chatid, messageId, param.text, json);    
                }                
            })

            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_SWAP_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setSellSwapLimitSetting(chatid, 1)
            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_LIMIT_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setSellSwapLimitSetting(chatid, 2)
            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_AUTO_MANUAL_SWITCH_MODE) {
            // console.log("swicthmode = ", session.addr)
            await botLogic.switchMode(chatid, session.addr, chainMode)
            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_AUTO_TAKE_PROFIT) {
            replyMsg = await sendMessage(
                stateData.sessionId,
                `Please enter highest limit percent to take profit.`
            );
            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_RISK_TAKE_PROFIT,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SELL_AUTO_STOP_LOSS) {
            replyMsg = await sendMessage(
                stateData.sessionId,
                `Please enter lowest limit percent to avoid loss.`
            );
            stateData.menu_id = messageId
            stateData.message_id = replyMsg.messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_RISK_STOP_LOSS,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SELL_AUTO_CREATE_ORDER) {

            await botLogic.switchAutoSellMode(chatid, session.addr, chainMode)

            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_50_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setSellTokenPercentAmount(chatid, 1)
            const user: any = await database.selectUser({ chatid: sessionId })
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: chainMode })
            token.sellAmount = user.stSellLeftAmount
            await token.save()

            await multichainSwap.sell(token.addr, database, chatid, async (param: any) => {
                console.log(`[${session.username}] [multichainSell] : = ${param.text}`)
                // const menu: any = await json_buy_success_menu(chatid);
                // let title: string = await getBuyMenuMessage(chatid);
                let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                // const menu: any = await json_sell_success_menu(chatid);
                
                await switchMenu(chatid, messageId, param.text, json);    
            })

            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_100_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setSellTokenPercentAmount(chatid, 2)
            const user: any = await database.selectUser({ chatid: sessionId })
            const token: any = await database.selectToken({ chatid: sessionId, addr: session.addr, chainID: chainMode })
            token.sellAmount = user.stSellRightAmount
            await token.save()

            await multichainSwap.sell(token.addr, database, chatid, async (param: any) => {
                console.log(`[${session.username}] [multichainSell] : = ${param.text}`)
                
                let json = [[json_buttonItem(chatid, OptionCode.CLOSE, "✖️ Close")]];
                await switchMenu(chatid, messageId, param.text, json);    
            })
            

            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_X_SETTING) {
            // await removeMessage(chatid, messageId)
            replyMsg = await sendMessage(
                stateData.sessionId,
                `Please enter % to sell (e.g. 50%)`
            );

            // await botLogic.setBuySolAmount(chatid, 6)
            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_SELL_X_SOL,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SELL_SUB_15_SLIPPAGE_SETTING) {
            // await removeMessage(chatid, messageId)
            await botLogic.setSellSlipIdx(chatid, 1)
            const menu: any = await json_sell_menu(chatid);
            let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SELL_SUB_X_SLIPPAGE_SETTING) {
            // await removeMessage(chatid, messageId)
            replyMsg = await sendMessage(
                stateData.sessionId,
                `Please enter sell slippage %`
            );

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_SELL_SLIPPAGE,
                stateData
            );
        }
        else if (cmd === MyOptionCode.POSITION_BUY_05_SETTING) {
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.BUY_SUB_05_SETTING,
                k: chatid,
            })
        }
        else if (cmd === MyOptionCode.POSITION_BUY_1_SETTING) {
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.BUY_SUB_1_SETTING,
                k: chatid,
            })
        }
        else if (cmd === MyOptionCode.POSITION_BUY_X_SETTING) {
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.BUY_SUB_X_SETTING,
                k: chatid,
            })
        }
        else  if (cmd === MyOptionCode.POSITION_SELECT_TOKEN) {

            const tokenSymbol = option.s;

            const token: any = await database.selectToken({chatid:sessionId, symbol:tokenSymbol})
            if (!token)
            {
                const msg = `⚠️ Sorry, Please exactly select a token to sell`;
                sendMessage(chatid, msg);
                return
            }

            session.addr = token.addr
            const menu: any = await json_position_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        } 
        else if (cmd === MyOptionCode.POSITION_SELL_50_SETTING) {
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.SELL_SUB_50_SETTING,
                k: chatid,
            })
        }
        else if (cmd === MyOptionCode.POSITION_SELL_100_SETTING) {            
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.SELL_SUB_100_SETTING,
                k: chatid,
            })
        }
        else if (cmd === MyOptionCode.POSITION_SELL_X_SETTING) {
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.SELL_SUB_X_SETTING,
                k: chatid,
            })
        }
        else if (cmd === MyOptionCode.POSITION_SORT_SETTING) {
            
        }
        else if (cmd === MyOptionCode.POSITION_SUB_BACK) {
            await executeCommand(chatid, messageId, undefined, {
                c: MyOptionCode.SELL_SUB_BACK_SETTING,
                k: chatid,
            })
        }
        else if (cmd === MyOptionCode.POSITION_SUB_REFRESH) {
            const menu: any = await json_position_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_SOLANA_MODE) {
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);
            
            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_ETHEREUM_MODE) {
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_BASE_MODE) {
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_BSC_MODE) {
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_TON_MODE) {
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_TOKEN_NET_MODE) {
            const menu: any = await json_withdraw_wallet_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_TOKEN_BACK) {
            const menu: any = await json_withdraw_chain_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_TOKEN_REFRESH) {
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_50_PERCENT) {
            await botLogic.setWithdrawAmountAndIDX(sessionId, 50, 1)

            const menu: any = await json_withdraw_wallet_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_100_PERCENT) {
            await botLogic.setWithdrawAmountAndIDX(sessionId, 100, 2)

            const menu: any = await json_withdraw_wallet_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_X_PERCENT) {
            const msg = `Please enter % to withdraw`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_WITHDRAW_X_PERCENT,
                stateData
            );
        }
        else if (cmd === MyOptionCode.WITHDRAW_X_SOL) {
            const menu: any = await json_withdraw_wallet_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_WALLET_ADDRESS) {
            const msg = `Please enter a wallet address to withdraw`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SET_WITHDRAW_WALLET_ADDRESS,
                stateData
            );
        }
        else if (cmd === MyOptionCode.WITHDRAW_WALLET_BACK) {
            session.withdrawWallet = ""
            const menu: any = await json_withdraw_token_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_WALLET_REFRESH) {
            // session.withdrawWallet = null
            const menu: any = await json_withdraw_wallet_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.WITHDRAW_OK) {

            // await botLogic.withdraw(chatid, session.withdrawWallet)
            await multichainSwap.withdrawToUser(database, chatid, session.withdrawWallet)
            
            session.withdrawWallet = ""
            const menu: any = await json_withdraw_wallet_menu(chatid);
            // let title: string = await getSellMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.MAIN_WALLET_MANAGE) {
            const menu: any = await json_deposit_wallet(chatid)
            openMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.MAIN_WALLET_IMPORT) {            
            const msg = `Please enter a deposit wallet private key to import`
			sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_WALLET_IMPROT,
                stateData
            );
        }
        else if (cmd === MyOptionCode.MAIN_REFERRALS_SETTING) {
            const menu: any = await json_referral_menu(chatid)
            openMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === MyOptionCode.SETTING_AUTO_BUY_ENABLED) {
            // await removeMessage(chatid, messageId)
            await botLogic.setAutoBuyEnable(chatid)
            
            const menu: any = await json_setting_menu(chatid);
            let title: string = await getSettingMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SETTING_AUTO_BUY_SOL) {
            // await removeMessage(chatid, messageId)
            // await botLogic.setAutoBuyEnable(chatid)
            
            const msg = `Enter the amount of ${afx.get_quote_name(chainMode).toUpperCase()} to buy with on each auto buy`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SETTING_AUTO_BUY_AMOUNT,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SETTING_BUY_LEFT_BUTTON || cmd === MyOptionCode.SETTING_BUY_RIGHT_BUTTON) {
            // await removeMessage(chatid, messageId)
            
            let statecode = 0
            let keyword = ""
            switch (cmd)
            {
                case MyOptionCode.SETTING_BUY_LEFT_BUTTON:
                    statecode = MyStateCode.WAIT_SETTING_BUY_LEFT_AMOUNT;
                    keyword = "left"
                    break;
                case MyOptionCode.SETTING_BUY_RIGHT_BUTTON:
                    statecode = MyStateCode.WAIT_SETTING_BUY_RIGHT_AMOUNT;
                    keyword = "right"
                    break;
            }

            const msg = `Enter the ${keyword} amount of ${afx.get_quote_name(chainMode).toUpperCase()} to buy with on each buy`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                statecode,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SETTING_SELL_LEFT_BUTTON || cmd === MyOptionCode.SETTING_SELL_RIGHT_BUTTON) {
            // await removeMessage(chatid, messageId)
            
            let statecode = 0
            let keyword = ""
            switch (cmd)
            {
                case MyOptionCode.SETTING_SELL_LEFT_BUTTON:
                    statecode = MyStateCode.WAIT_SETTING_SELL_LEFT_AMOUNT;
                    keyword = "left"
                    break;
                case MyOptionCode.SETTING_SELL_RIGHT_BUTTON:
                    statecode = MyStateCode.WAIT_SETTING_SELL_RIGHT_AMOUNT;
                    keyword = "right"
                    break;
            }

            const msg = `Enter the ${keyword} amount of Percentage to sell with on each sell`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId

            stateMap_setFocus(
                chatid,
                statecode,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SETTING_BUY_SLIPPAGE || cmd === MyOptionCode.SETTING_SELL_SLIPPAGE) {
            // await removeMessage(chatid, messageId)
            // await botLogic.setAutoBuyEnable(chatid)
            
            let statecode = 0
            let keyword = ""
            switch (cmd)
            {
                case MyOptionCode.SETTING_BUY_SLIPPAGE:
                    statecode = MyStateCode.WAIT_SETTING_BUY_SLIPPAGE;
                    keyword = "buy"
                    break;
                case MyOptionCode.SETTING_SELL_SLIPPAGE:
                    statecode = MyStateCode.WAIT_SETTING_SELL_SLIPPAGE;
                    keyword = "sell"
                    break;
            }

            const msg = `Enter the amount of slippage to ${keyword} with on each ${keyword}`
			replyMsg = await sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.message_id = replyMsg.messageId
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                statecode,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SETTING_TRX_PRIORITY) {
            // await removeMessage(chatid, messageId)
            // await botLogic.setAutoBuyEnable(chatid)
            
            await botLogic.setTrxPriority(chatid)
            
            const menu: any = await json_setting_menu(chatid);
            let title: string = await getSettingMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.SETTING_TRX_PRIORITY_FEE) {
            // await removeMessage(chatid, messageId)
            
            const msg = `Enter the amount of priority fee with on each auto buy`
			sendMessage(chatid, msg)
			// await bot.answerCallbackQuery(callbackQueryId, { text: msg })

            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                MyStateCode.WAIT_SETTING_AUTO_PRIORITY_FEE,
                stateData
            );
        }
        else if (cmd === MyOptionCode.SETTING_MEV_PROTECT) {
            // await removeMessage(chatid, messageId)
            // await botLogic.setAutoBuyEnable(chatid)
            
            await botLogic.setMevProtect(chatid)
            
            const menu: any = await json_setting_menu(chatid);
            let title: string = await getSettingMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === MyOptionCode.MAIN_CHAIN_SOLANA ||
            cmd === MyOptionCode.MAIN_CHAIN_BASE ||
            cmd === MyOptionCode.MAIN_CHAIN_ETHEREUM ||
            cmd === MyOptionCode.MAIN_CHAIN_BSC ||
            cmd === MyOptionCode.MAIN_CHAIN_TON ) 
        {
            let chainMode: any = afx.MainChain.ETHEREUM_NET

            afx.set_chain_mode(chainMode)

            // if ((chainMode != afx.MainChain.SOLANA_NET ) && (chainMode != afx.MainChain.TON_NET))
            if (chainMode != afx.MainChain.TON_NET)
            {
                // let bCreate = createChainWebSocket(afx.get_chain_name(chainMode)) //Websocket
                BaseNewPairMonitor.setChainMode(chainMode);
                await BaseNewPairMonitor.getNewPairsAPI()

                BaseTrendingTokenMonitor.setChainMode(chainMode);
                await BaseTrendingTokenMonitor.getTrendingTokenAPI();
            }

            await multichainAPI.initUtils(chainMode)

            await botLogic.setUserChainMode(chatid, chainMode)
            session.lastUsedChainMode = chainMode
            
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_LOG_TRADE) {
            const data: any = informMap.get(messageId)
            session.addr = data.addr
            deleteInform(messageId)
            const token: any = await database.selectToken({ chatid, addr: session.addr })
            if (!token) {
                const { exist, symbol, decimal }: any = await utils.getTokenInfo(session.addr)
                await botLogic.registerToken(chatid, session.addr, symbol, decimal)
            }
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            openMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_SETTING_DETECTION) {
            const menu: any = await json_detection_settings(sessionId)
            await openMenu(sessionId, messageId, menu.title, menu.options)
        } else if (cmd === OptionCode.MAIN_DETECTION_MINTABLE) {
            await botLogic.switchPoolDetectionMintable(sessionId)
            const menu: any = await json_detection_settings(sessionId)
            await switchMenu(sessionId, messageId, menu.title, menu.options)
        } else if (cmd === OptionCode.MAIN_DETECTION_LOCKED) {
            await botLogic.switchPoolDetectionPoolLocked(sessionId)
            const menu: any = await json_detection_settings(sessionId)
            await switchMenu(sessionId, messageId, menu.title, menu.options)
        } else if (cmd === OptionCode.MAIN_DETECTION_POOL_AMOUNT) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with pool amount to detect auto.\nExample: 5~80`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_DETECTION_POOL_AMOUNT,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_DETECTION_POOL_AMOUNT_CEHCK) {
            await botLogic.switchPoolDetectionPoolAmount(sessionId)
            const menu: any = await json_detection_settings(sessionId)
            await switchMenu(sessionId, messageId, menu.title, menu.options)
        } else if (cmd === OptionCode.MAIN_DETECTION_CHANGE_PERCENT) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with volume changed percent to detect auto.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_DETECTION_CHANGE_PERCENT,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_DETECTION_CHANGE_PERCENT_CHECK) {
            await botLogic.switchPoolDetectionPoolChanged(sessionId)
            const menu: any = await json_detection_settings(sessionId)
            await switchMenu(sessionId, messageId, menu.title, menu.options)
        } else if (cmd === OptionCode.MAIN_SET_PRIORITY) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with sol amount to use as priority value.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_PRIORITY,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_BUY_X) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with sol amount to auto buy.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_AUTO_BUY_AMOUNT,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_BUY_1) {
            await botLogic.setAutoBuyAmount(chatid, session.addr, 0.001)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);
            await switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_BUY_2) {
            await botLogic.setAutoBuyAmount(chatid, session.addr, 0.002)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);
            await switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_BUY_10) {
            await botLogic.setAutoBuyAmount(chatid, session.addr, 0.01)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);
            await switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_SELL_X) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with token amount to sell auto.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_AUTO_SELL_AMOUNT,
                stateData
            );
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_SELL_25) {
            await botLogic.setAutoSellAmount(chatid, session.addr, 25)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);
            await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_SELL_50) {
            await botLogic.setAutoSellAmount(chatid, session.addr, 50)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);
            await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === OptionCode.MAIN_SETTING_AUTO_SELL_100) {
            await botLogic.setAutoSellAmount(chatid, session.addr, 100)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);
            await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === OptionCode.MAIN_REFRESH) {
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            switchMenu(chatid, messageId, title, menu.options);
        } else if (cmd === OptionCode.MAIN_WALLET_MANAGE) {
            const menu: any = await json_deposit_wallet(chatid)
            openMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === OptionCode.MAIN_REG_BUY_SETTING) {
            // const menu: any = await json_deposit_wallet(chatid)
            openMessage(chatid, "", 0, "Please enter token address to buy");
        } else if(cmd === OptionCode.MAIN_REG_SELL_SETTING){

            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, menu.title, menu.options);
            
        } else if(cmd === OptionCode.MAIN_REG_SELL_REFRESH){

            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
            
        } else if (cmd === OptionCode.MAIN_REG_BUY_REFRESH) {
            
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            switchMenu(chatid, messageId, title, menu.options);
        } 
        else if (cmd === OptionCode.MAIN_REG_SELL_SWITCH_MODE) {

            // const token: any = await database.selectToken({chatid: chatid})
            // if(token.addr)
            console.log("swicthmode = "+session.addr)
            await botLogic.switchMode(chatid, session.addr, chainMode)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        } else if (cmd === OptionCode.MAIN_MENU) {
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_SWITCH_AUTO_BUY) {
            await removeMessage(chatid, messageId)
            await botLogic.switchAutoBuyMode(chatid, session.addr)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_SWITCH_AUTO_SELL) {
            await removeMessage(chatid, messageId)

            // const token: any = await database.selectToken({chatid: chatid})
            // if(token.addr)
            await botLogic.switchAutoSellMode(chatid, session.addr, chainMode)

            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, menu.title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_RISK_MANAGE) {
            const menu: any = await json_risk_management(chatid)
            openMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_RISK_TAKE_PROFIT) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with highest limit percent to take profit.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_RISK_TAKE_PROFIT,
                stateData
            );
        }
        else if (cmd === OptionCode.MAIN_RISK_STOP_LOSS) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with lowest limit percent to avoid loss.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_RISK_STOP_LOSS,
                stateData
            );
        }
        else if (cmd === OptionCode.MAIN_SET_SLIPPAGE) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with slippage value to set.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_SLIPPAGE,
                stateData
            );
        }
        else if (cmd === OptionCode.MAIN_BUY_25) {
            // await botLogic.buy(chatid, session.addr, 0.25)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_BUY_50) {
            // await botLogic.buy(chatid, session.addr, 0.5)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_BUY_100) {
            // await botLogic.buy(chatid, session.addr, 1)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_BUY_X) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with amount of SOL to buy.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_BUY_X,
                stateData
            );
        }
        else if (cmd === OptionCode.MAIN_SELL_25) {
            await botLogic.sell(chatid, session.addr, 25)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_SELL_50) {
            await botLogic.sell(chatid, session.addr, 50)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_SELL_100) {
            await botLogic.sell(chatid, session.addr, 100)
            const menu: any = await json_reg_sell(chatid);
            // let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_SELL_X) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with amount of token to sell.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_SET_SELL_X,
                stateData
            );
        }
        else if (cmd === OptionCode.MAIN_SWITCH_AUTO_DETECT) {
            await removeMessage(chatid, messageId)
            await botLogic.switchAutoDetection(chatid)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_SWITCH_MODE) {
            await botLogic.switchMode(chatid, session.addr, chainMode)
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await switchMenu(chatid, messageId, title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_WALLET_REFRESH) {
            const menu: any = await json_deposit_wallet(chatid)
            await switchMenu(chatid, messageId, menu.title, menu.options);
        }
        else if (cmd === OptionCode.MAIN_WALLET_EXPORT) {
            const depositWallet = await multichainAPI.getDepositWallet(database, chatid);            
            await openMessage(
                chatid, "", 0,
                `<code>${depositWallet}</code>`
            );
        } else if (cmd === OptionCode.MAIN_WALLET_IMPORT) {
            await sendReplyMessage(
                stateData.sessionId,
                `📨 Reply to this message with your phantom wallet private key to import.`
            );
            stateData.menu_id = messageId
            stateMap_setFocus(
                chatid,
                StateCode.WAIT_WALLET_IMPROT,
                stateData
            );
        }
        else if (cmd === OptionCode.HELP_BACK) {
            await removeMessage(chatid, messageId);
            const menu: any = await json_main(chatid);
            let title: string = await getMainMenuMessage(chatid);

            await openMenu(chatid, cmd, title, menu.options);
        } else if (cmd === OptionCode.CLOSE) {
            await removeMessage(chatid, messageId);
        } else if (cmd === OptionCode.MAIN_HELP) {
            await removeMessage(chatid, messageId);
            const menu: any = await json_help(chatid);

            await openMenu(
                chatid,
                messageId,
                menu.title,
                menu.options
            );
        }
    } catch (error) {
        console.log(error);
        sendMessage(
            chatid,
            `😢 Sorry, there was some errors on the command. Please try again later 😉`
        );
        // if (callbackQueryId)
        //     await bot.answerCallbackQuery(callbackQueryId, {
        //         text: `😢 Sorry, there was some errors on the command. Please try again later 😉`,
        //     });
    }
};
