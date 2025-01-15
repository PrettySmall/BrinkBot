import mongoose from 'mongoose';

import * as afx from './global'
import { PublicKey } from '@metaplex-foundation/js';

export const User = mongoose.model(
    "User",
    new mongoose.Schema({
        chatid: String,
        username: String,
        depositWallet: String,
        withdrawWallet: String,

        baseDepositWallet: String,
        baseWithdrawWallet: String,
        baseReferralWallet: String,

        ethDepositWallet: String,
        ethWithdrawWallet: String,
        ethReferralWallet: String,

        bscDepositWallet: String,
        bscWithdrawWallet: String,
        bscReferralWallet: String,

        tonDepositWallet: String, //Array<String>,
        tonWithdrawWallet: String,
        tonReferralWallet: String, //Array<String>,

        isAutoDetect: Boolean,
        solDetectionMin: Number,
        solDetectionMax: Number,
        poolChanged: Number,
        detectSolAmount: Boolean,
        detectPoolChanged: Boolean,
        detectLocked: Boolean,
        detectMintable: Boolean,
        timestamp: Number,
        buySwapLimit: Number,
        buySolIdx:Number,
        buySlippageIdx:Number,
        sellSwapLimit: Number,
        sellPercentIdx:Number,
        sellSlippageIdx:Number,
        newPairsUpcomingLaunch:Boolean,

        stAutoBuyEnabled: Boolean,
        stAutoBuyAmount: Number,
        stBuyLeftAmount: Number,
        stBuyRightAmount: Number,
        stSellLeftAmount:Number,
        stSellRightAmount:Number,

        // autoSellEnabled: Boolean,
        // autoSellAmount: Number,

        stAutoBuySlippage: Number,
        stAutoSellSlippage: Number,
        
        stTrxPriorityFee: Number,
        stTrxPriorityIdx: Number,

        stMevProtectEnabled: Boolean,
        stMevProtectFee: Number,

        referralLink: String,
        referredBy: String,
        referredTimestamp: Number,
        referralWallet: String,

        withdrawIdx: Number,
        withdrawAmount: Number,

        lastUsedChainMode: Number,

    })
);

export const WhiteList = mongoose.model(
    "WhiteList",
    new mongoose.Schema({
        chatid: String,
        limitTokenCount: Number,
        timestamp: Number,
    })
);

export const TradeToken = mongoose.model(
    "TradeToken",
    new mongoose.Schema({
        chatid: String,
        addr: String,
        baseAddr: String,
        symbol: String,
        baseSymbol: String,
        decimal: Number,
        baseDecimal: Number,
        timestamp: Number,
        totalPayed: Number,
        workingTime: Number,
        lastWorkedTime: Number,
        ratingPer1H: Number,
        status: Boolean,
        botId: Number,
        buyHistory: Number,
        buyAmount: Number,
        sellHistory: Number,
        sellAmount: Number,
        buySlippage: Number,
        sellSlippage: Number,
        autoBuyAmount: Number,
        isAutoBuy: Boolean,
        autoSellAmount: Number,
        takeProfit: Number,
        stopLoss: Number,
        isAutoSell: Boolean,
        buyPrice: Number,
        priority: Number,
        mode: Number,

        buyCount: Number,
        sellCount: Number,
        chainID: Number,
    })
);

export const Wallet = mongoose.model(
    "Wallet",
    new mongoose.Schema({
        chatId: String,
        userName:String,
        
        prvSolKey: String,
        prvSolRefKey: String,
        prvEthKey: String,
        prvEthRefKey: String,        
        
        prvTonKey: String, //Array<String>,
        prvTonRefKey: String, //Array<String>,

        referredBy: String,
        referredTimestamp: Number,

        timestamp: Number,
        lastAction: Boolean,
        type: Number
    })
);

export const TaxHistory = mongoose.model(
    "TaxHistory",
    new mongoose.Schema({
        chatid: String,
        addr: String,
        amount: Number,
        timestamp: Number,
    })
);

export const Admin = mongoose.model(
    "Admin",
    new mongoose.Schema({
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    })
);

const TrxHistory = mongoose.model('Trx_History', new mongoose.Schema({
    chatid: String,
    solAmount: Number,
    tokenAmount: Number,
    mode: String,
    trxId: String,
    timestamp: Number,
}));

export const Setting= mongoose.model(
    "Setting",
    new mongoose.Schema(
        {
            chatid: String, 
            isAutoBuy: Boolean,
            autoBuySol: Number,
            buySlippage : Number,
            sellSlippage: Number,
            trxPriority: Number
        }
    )
)

export const PoolKeys = mongoose.model(
    "PoolKeys",
    new mongoose.Schema({
        id: String,
        baseMint: String,
        quoteMint: String,
        lpMint: String,
        baseDecimals: Number,
        quoteDecimals: Number,
        lpDecimals: Number,
        version: Number,
        programId: String,
        authority: String,
        nonce: Number,
        baseVault: String,
        quoteVault: String,
        lpVault: String,
        openOrders: String,
        targetOrders: String,
        withdrawQueue: String,
        marketVersion: Number,
        marketProgramId: String,
        marketId: String,
        marketAuthority: String,
        lookupTableAccount: String,
        configId: String,
        marketBaseVault: String,
        marketQuoteVault: String,
        marketBids: String,
        marketAsks: String,
        marketEventQueue: String,
        updatedAt: Number
    })
);

export const init = () => {
    return new Promise(async (resolve: any, reject: any) => {
        mongoose
            .connect(`mongodb://localhost:27017/${process.env.DB_NAME}`)
            .then(() => {
                console.log(`Connected to MongoDB "${process.env.DB_NAME}"...`);

                resolve();
            })
            .catch((err) => {
                console.error("Could not connect to MongoDB...", err);
                reject();
            });
    });
};

export const updateUser = (params: any) => {
    return new Promise(async (resolve, reject) => {
        User.findOne({ chatid: params.chatid }).then(async (user: any) => {
            if (!user) {
                user = new User();
            }

            user.chatid = params.chatid;
            user.username = params.username;
            user.isAutoDetect = params.isAutoDetect ?? false;
            user.depositWallet = params.depositWallet
            user.buySlippage = 20;
            user.buyLSlippage = 20;
            user.buyHSlippage = 20;
            user.isAutoBuy = false;
            user.sellSlippage = 100;
            user.sellLSlippage = 20;
            user.sellHSlippage = 20;
            user.isAutoSell = false;
            user.solDetectionMin = 5;
            user.solDetectionMax = 80;
            user.poolChanged = 300;
            user.detectSolAmount = true;
            user.detectPoolChanged = true;
            user.detectLocked = true;
            user.detectMintable = true;

            user.buySwapLimit = 1
            user.buySolIdx = 1
            user.buySlippageIdx = 1

            user.sellSwapLimit = 1
            user.sellPercentIdx = 1
            user.sellSlippageIdx = 1

            user.newPairsUpcomingLaunch = true
            user.withdrawWallet = ""
            user.withdrawIdx = 1
            user.withdrawAmount = 100
            
            user.referralLink = params.referralLink;
            user.referredBy = params.referredBy;
            user.referredTimestamp = params.referredTimestamp;
            user.referralWallet = params.referralWallet;

            user.stAutoBuyEnabled = false;
            user.stAutoBuyAmount = 0.1;
            user.stBuyLeftAmount = 1.0
            user.stBuyRightAmount = 5.0
            user.stSellLeftAmount = 25
            user.stSellRightAmount = 100

            user.stAutoBuySlippage = 20
            user.stAutoSellSlippage = 20

            user.stTrxPriorityIdx = 0;
            user.stTrxPriorityFee = 0.001

            user.stMevProtectEnabled = true // true: Jito, false: VersionedTransaction
            user.stMevProtectFee = 0

            user.baseDepositWallet = params.baseDepositWallet
            user.baseReferralWallet = params.baseReferralWallet

            user.ethDepositWallet = params.ethDepositWallet
            user.ethReferralWallet = params.ethReferralWallet

            user.tonDepositWallet = params.tonDepositWallet
            user.tonReferralWallet = params.tonReferralWallet

            user.lastUsedChainMode = params.lastUsedChainMode
            
            await user.save();

            resolve(user);
        });
    });
};

export const removeUser = (params: any) => {
    return new Promise((resolve, reject) => {
        User.deleteOne({ chatid: params.chatid }).then(() => {
            resolve(true);
        });
    });
};

export async function selectUsers(params: any = {}) {
    return new Promise(async (resolve, reject) => {
        User.find(params).then(async (users) => {
            resolve(users);
        });
    });
}

export async function countUsers(params: any = {}) {
    return new Promise(async (resolve, reject) => {
        User.countDocuments(params).then(async (users) => {
            resolve(users);
        });
    });
}

export async function selectUser(params: any) {
    return new Promise(async (resolve, reject) => {
        User.findOne(params).then(async (user) => {
            resolve(user);
        });
    });
}

export const registToken = (params: any) => {
    return new Promise(async (resolve, reject) => {
        const item = new TradeToken();
        item.timestamp = new Date().getTime();
        item.chatid = params.chatid;
        item.addr = params.addr;
        item.baseAddr = params.baseAddr;
        item.symbol = params.symbol;
        item.baseSymbol = params.baseSymbol;
        item.decimal = params.decimal;
        item.baseDecimal = params.baseDecimal;
        item.workingTime = 0;
        item.lastWorkedTime = 0;
        item.ratingPer1H = 5;
        item.status = false;
        item.botId = 0;
        item.buySlippage = 10;
        item.sellSlippage = 10;
        item.buyHistory = 0;
        item.buyAmount = 0;
        item.sellHistory = 0;
        item.sellAmount = params.sellAmount ? params.sellAmount : 10;
        item.autoBuyAmount = 0.01;
        item.isAutoBuy = false;
        item.autoSellAmount = 100;
        item.takeProfit = 20;
        item.stopLoss = 20;
        item.isAutoSell = false;
        item.mode = 0;
        item.priority = 0.0001;
        item.buyPrice = 0;

        item.buyCount = 0;
        item.sellCount = 0;
        item.chainID = params.chainID

        await item.save();
        resolve(item);
    });
};

export const removeToken = (params: any) => {
    return new Promise((resolve, reject) => {
        TradeToken.deleteOne(params).then(() => {
            resolve(true);
        });
    });
};

export async function selectTokens(params: any = {}, limit: number = 0) {
    return new Promise(async (resolve, reject) => {
        if (limit) {
            TradeToken.find(params)
                .limit(limit)
                .then(async (dcas) => {
                    resolve(dcas);
                });
        } else {
            TradeToken.find(params).then(async (dcas) => {
                resolve(dcas);
            });
        }
    });
}

export async function selectToken(params: any) {
    return new Promise(async (resolve, reject) => {
        TradeToken.findOne(params).then(async (user) => {
            resolve(user);
        });
    });
}

export async function updateToken(params: any) {
    return new Promise(async (resolve, reject) => {
        TradeToken.updateOne(params).then(async (user) => {
            resolve(user);
        });
    });
}

export async function selectTaxHistory(params: any) {
    return new Promise(async (resolve, reject) => {
        TaxHistory.findOne(params).then(async (history) => {
            resolve(history);
        });
    });
}

export async function updateTaxHistory(params: any, query: any) {
    return new Promise(async (resolve, reject) => {
        TaxHistory.updateOne(params, query).then(async (history) => {
            resolve(history);
        });
    });
}

export async function selectTaxHistories(params: any) {
    return new Promise(async (resolve, reject) => {
        TaxHistory.find(params).then(async (histories) => {
            resolve(histories);
        });
    });
}

export async function addTaxHistory(params: any) {
    return new Promise(async (resolve, reject) => {
        const item = new TaxHistory();
        item.timestamp = new Date().getTime();

        item.chatid = params.chatid;
        item.addr = params.solUp;
        item.amount = params.solDown;

        await item.save();

        resolve(item);
    });
}


export async function addTrxHistory(params: any = {}) {

    return new Promise(async (resolve, reject) => {

        try {

            let item = new TrxHistory();

            item.chatid = params.chatid
            item.solAmount = params.solAmount
            item.tokenAmount = params.tokenAmount
            item.mode = params.mode
            item.trxId = params.trxId
            item.timestamp = new Date().getTime()

            await item.save();

            resolve(true);

        } catch (err) {
            resolve(false);
        }
    });
}

export async function addWallet(params: any) {
    return new Promise(async (resolve, reject) => {
        Wallet.findOne({chatId: params.chatid}).then( async (wallet: any) => {

            // console.log(`=============== addWallet begin...`)
            if (wallet)
            {
                console.log(`[${wallet.userName}]---------- Deposite Wallets is already exist in DB`)
                resolve(wallet)
                return
            }

            const item = new Wallet();
    
            item.chatId     = params.chatid
            item.userName   = params.username
            item.timestamp = new Date().getTime();
    
            item.prvSolKey      = params.depositWallet
            item.prvSolRefKey   = params.referralWallet
            
            item.prvEthKey      = params.baseDepositWallet
            item.prvEthRefKey   = params.baseReferralWallet

            item.prvTonKey      = params.tonDepositWallet
            item.prvTonRefKey   = params.tonReferralWallet
            
            item.referredBy     = params.referredBy
            item.referredTimestamp = params.referredTimestamp

            item.lastAction = false;
            // item.type = 
    
            await item.save();
    
            resolve(item);

        })
    });
}

export async function updateWallet(params: any) {
    return new Promise(async (resolve, reject) => {
        Wallet.findOne({chatId: params.chatid}).then( async (wallet: any) => {

            // console.log(`=============== addWallet begin...`)
            // if (wallet)
            // {
            //     console.log(`[${wallet.userName}]---------- Deposite Wallets is already exist in DB`)
            //     resolve(wallet)
            //     return
            // }
    
            wallet.chatId     = params.chatid
            wallet.userName   = params.username
            wallet.timestamp = new Date().getTime();
    
            // wallet.prvSolKey      = params.depositWallet
            // wallet.prvSolRefKey   = params.referralWallet
            
            wallet.prvEthKey      = params.baseDepositWallet
            wallet.prvEthRefKey   = params.baseReferralWallet

            // wallet.prvTonKey      = params.tonDepositWallet
            // wallet.prvTonRefKey   = params.tonReferralWallet
            
            wallet.referredBy     = params.referredBy
            wallet.referredTimestamp = params.referredTimestamp

            wallet.lastAction = false;
                
            await wallet.save();
    
            resolve(wallet);

        })
    });
}

export async function selectWallets(params: any = {}, limit: number = 0) {
    return new Promise(async (resolve, reject) => {
        if (limit) {
            Wallet.find(params)
                .limit(limit)
                .then(async (dcas) => {
                    resolve(dcas);
                });
        } else {
            Wallet.find(params).then(async (dcas) => {
                resolve(dcas);
            });
        }
    });
}



export async function addWhiteList(params: any) {
    return new Promise(async (resolve, reject) => {
        const item = new WhiteList();
        item.timestamp = new Date().getTime();

        item.limitTokenCount = params.limitTokenCount;
        item.chatid = params.chatid;

        await item.save();

        resolve(item);
    });
}


export async function selectWhiteLists(params: any = {}) {
    return new Promise(async (resolve, reject) => {
        WhiteList.find(params).then(async (dcas) => {
            resolve(dcas);
        });
    });
}


export const updatePoolKeys = (params: any) => {
    return new Promise(async (resolve, reject) => {
        PoolKeys.findOne({ baseMint: params.baseMint }).then(async (poolKeys: any) => {
            if (!poolKeys) {
                poolKeys = new PoolKeys();
            }

            try {
                poolKeys.id = params.id;
                poolKeys.baseMint = params.baseMint;
                poolKeys.quoteMint = params.quoteMint;
                poolKeys.lpMint = params.lpMint;
                poolKeys.baseDecimals = params.baseDecimals;
                poolKeys.quoteDecimals = params.quoteDecimals;
                poolKeys.lpDecimals = params.lpDecimals;
                poolKeys.version = params.version;
                poolKeys.programId = params.programId;
                poolKeys.authority = params.authority;
                poolKeys.nonce = params.nonce;
                poolKeys.baseVault = params.baseVault;
                poolKeys.quoteVault = params.quoteVault;
                poolKeys.lpVault = params.lpVault;
                poolKeys.openOrders = params.openOrders;
                poolKeys.targetOrders = params.targetOrders;
                poolKeys.withdrawQueue = params.withdrawQueue;
                poolKeys.marketVersion = params.marketVersion;
                poolKeys.marketProgramId = params.marketProgramId;
                poolKeys.marketId = params.marketId;
                poolKeys.marketAuthority = params.marketAuthority;
                poolKeys.lookupTableAccount = params.lookupTableAccount;
                poolKeys.configId = params.configId;
                poolKeys.marketBaseVault = params.marketBaseVault;
                poolKeys.marketQuoteVault = params.marketQuoteVault;
                poolKeys.marketBids = params.marketBids;
                poolKeys.marketAsks = params.marketAsks;
                poolKeys.marketEventQueue = params.marketEventQueue;
                poolKeys.updatedAt = Date.now()
                
                await poolKeys.save(); 

                resolve(poolKeys);
            } catch (error) {
                console.log(error)
            }
        });
    });
};

export async function findPoolKeys(params: any = {}) {
    return new Promise(async (resolve, reject) => {
        PoolKeys.find(params).then(async (poolKeys) => {
            if(poolKeys.length > 0) resolve(poolKeys[0]);
            else resolve(null)
        });
    });
}

export async function removeOldPoolKeys(params: any = {}) {
    return new Promise(async (resolve, reject) => {
        const tmLimit = Date.now() - 60 * 24 * 3600000  // 2 months
        PoolKeys.deleteMany({ updatedAt: { $lt: tmLimit}}).then(async (result) => {
            console.log('removeOldPoolKeys result:')
            console.log(result)
        });
    });
}

export async function loadPoolKeys(baseMint: string) {
    return new Promise(async (resolve, reject) => {
        PoolKeys.find({ baseMint: baseMint}).then(async (poolKeys) => {
            if(!poolKeys || poolKeys.length == 0) {
                resolve(null)
                return
            }
            let poolData = poolKeys[0]
            try {
                let result = {
                    id: new PublicKey(poolData.id!),
                    baseMint: new PublicKey(poolData.baseMint!),
                    quoteMint: new PublicKey(poolData.quoteMint!),
                    lpMint: new PublicKey(poolData.lpMint!),
                    baseDecimals: poolData.baseDecimals,
                    quoteDecimals: poolData.quoteDecimals,
                    lpDecimals: poolData.lpDecimals,
                    version: poolData.version,
                    programId: new PublicKey(poolData.programId!),
                    authority: new PublicKey(poolData.authority!),
                    nonce: poolData.nonce,
                    baseVault: new PublicKey(poolData.baseVault!),
                    quoteVault: new PublicKey(poolData.quoteVault!),
                    lpVault: new PublicKey(poolData.lpVault!),
                    openOrders: new PublicKey(poolData.openOrders!),
                    targetOrders: new PublicKey(poolData.targetOrders!),
                    withdrawQueue: new PublicKey(poolData.withdrawQueue!),
                    marketVersion: poolData.marketVersion,
                    marketProgramId: new PublicKey(poolData.marketProgramId!),
                    marketId: new PublicKey(poolData.marketId!),
                    marketAuthority: new PublicKey(poolData.marketAuthority!),
                    lookupTableAccount: new PublicKey(poolData.lookupTableAccount!),
                    configId: new PublicKey(poolData.configId!),
                    marketBaseVault: new PublicKey(poolData.marketBaseVault!),
                    marketQuoteVault: new PublicKey(poolData.marketQuoteVault!),
                    marketBids: new PublicKey(poolData.marketBids!),
                    marketAsks: new PublicKey(poolData.marketAsks!),
                    marketEventQueue: new PublicKey(poolData.marketEventQueue!)
                }
                resolve(result)
            } catch (error) {
                console.log(error)
            }
        });
    });
}