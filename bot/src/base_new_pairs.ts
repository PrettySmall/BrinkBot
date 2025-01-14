

import {client as WebSocketClient, Message} from 'websocket';
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

import * as BirdeyeAPI from './birdeyeAPI'
import { g_ChainMode } from './global';

// const CHAIN= 'base'
// const WSS_TOKEN_URL = `wss://public-api.birdeye.so/socket/${CHAIN}?x-api-key=${process.env.BIRDEYE_API_KEY}`

let WSS_TOKEN_URL: string = '';
let activeConnection: any = null;
let client: any = null;

interface Pair {
    token: string;
    tx?: string;
    pool?: string;
    owner?: string;
    createdAt?: number;
    solAmount?: number;
    circleSupply?: number;
    mcUsd?: number;
    initLiquidityUsd?: number;
    tokenAmount?: number;
    price?: number;
    name?: string;
    symbol?: string;
    logUri?: string;
    decimals?: number;
    totalSupply?: number;
    bRenounced?: boolean;
    bNotRugged?: boolean;
    wsClient?: WebSocketClient;
    liquidityAddedAt?: number;
}

function convertToEpochTime(timestamp: string): number {
    const date = new Date(timestamp);
    const epochTime = Math.floor(date.getTime());
    return epochTime;
}

export const BaseNewPairMonitor = {
    limit: 4,
    pairs: [] as Pair[],
    newPairs: [] as Pair[],
    ethPrice: 200,
    chainMode : 0,

    addNew: async function(pair: Pair) {
        // console.log('addNew: ' + pair.token)
        const existPairs = BaseNewPairMonitor.pairs.filter(item => item.token === pair.token);
        // console.log(`aaaaaaaaaaaaa  ======== `, existPairs.length, BaseNewPairMonitor.limit)
        if (existPairs.length > 0) 
        {
            console.log(`@@@@@@@@@ token already exist!`)
            return;
        }
            
        BaseNewPairMonitor.pairs.push(pair);
        // console.log("===================", pair)
        let auditResult = await BaseNewPairMonitor.checkAudit(pair)
        // retry once more checkAudit if result is false
        if(!auditResult) auditResult = await BaseNewPairMonitor.checkAudit(pair)
        if(!auditResult) {
            BaseNewPairMonitor.pairs.pop()
            return
        }
        // pair.wsClient = registerPriceWebsocket(pair.token);
        if (BaseNewPairMonitor.pairs.length > BaseNewPairMonitor.limit) {
            try {
                // if (NewPairMonitor.pairs[0].wsClient) {
                //     NewPairMonitor.pairs[0].wsClient.abort()
                // }
                // delete NewPairMonitor.pairs[0].wsClient;
                BaseNewPairMonitor.pairs.splice(0, 1);
            } catch (error) {
                console.log(error);
            }
        }
    },
    checkAudit: async function(pair: Pair) {
        try {
            let response: any = null;
            let data: any = null;           
            
            // console.log(tokenInfo)
            return true
        } catch (err) {
            console.error("[checkAudit] := ", err);
            return false
        }
    },
    updateTokenInfo: function(newInfo: Pair) {
        const existPairs = BaseNewPairMonitor.pairs.filter(item => item.token === newInfo.token);
        if (existPairs.length === 0) return;
        const targetPair = existPairs[0];
        // Update the target pair with new info if needed
    },
    getCurrentPairs: function() {
        return BaseNewPairMonitor.pairs.map(item => {
            let lifeTime = Date.now() - (item.createdAt || 0);
            let lifeTimeStr = '';
            lifeTime = Math.floor(lifeTime / 1000);
            if (lifeTime < 60) {
                lifeTimeStr = lifeTime + 's ago';
            } else if (lifeTime < 3600) {
                lifeTime = Math.floor(lifeTime / 60);
                lifeTimeStr = lifeTime + 'm ago';
            } else {
                lifeTime = Math.floor(lifeTime / 3600);
                lifeTimeStr = lifeTime + 'h ago';
            }
            return {
                token: item.token,
                name: item.name,
                symbol: item.symbol,
                lifeTime: lifeTimeStr,
                pool: item.pool,
                bRenounced: item.bRenounced,
                bNotRugged: item.bNotRugged,
                mcUsd: item.mcUsd,
                initLiquidityUsd: item.initLiquidityUsd
            };
        });
    },
    setChainMode(_chainMode : number)
    {
        BaseNewPairMonitor.chainMode = _chainMode
        BaseNewPairMonitor.emptyPairs()
    },
    addNewAPI: async function(pair: Pair) {
        // console.log('+++++++++++++ addNew: ' + pair.token, BaseNewPairMonitor.limit)
        // const existPairs = BaseNewPairMonitor.pairs.filter(item => item.token === pair.token);
        // console.log(`aaaaaaaaaaaaa  ======== `, existPairs.length, BaseNewPairMonitor.limit)
        // if (existPairs.length > 0) 
        // {
        //     console.log(`@@@@@@@@@ token already exist!`)
        //     return;
        // }
        
        BaseNewPairMonitor.pairs.push(pair);
        // console.log("===================", pair)
        let auditResult = await BaseNewPairMonitor.checkAudit(pair)
        if(!auditResult) {
            BaseNewPairMonitor.pairs.pop()
            return false
        }

        if (BaseNewPairMonitor.pairs.length > BaseNewPairMonitor.limit) {
            let idx = BaseNewPairMonitor.pairs.length
            BaseNewPairMonitor.pairs.splice(idx-1, 1);
            return true
        }
        return false
    },    
    getNewPairsAPI: async function() {

        try {
            let chainMode: number = BaseNewPairMonitor.chainMode
            let data:any = await BirdeyeAPI.getTokenNewPair_Birdeye(chainMode)

            // console.log(`=========`, data)

            if (BaseNewPairMonitor.pairs.length)
            {
                BaseNewPairMonitor.pairs.splice(0, BaseNewPairMonitor.pairs.length)
            }

            for (let i = 0; data && data.items && i < data.items.length; i++)
            {

                let item = data.items[i]
                if (!item || !item.symbol || !item.name) continue
                // if (BaseNewPairMonitor.pairs.length == 4) break

                let createTime = convertToEpochTime(item.liquidityAddedAt)
                // console.log(`========== create_time = `, createTime)

                const newPair: Pair = {
                    name: item.name,
                    symbol: item.symbol,
                    decimals: item.decimals,
                    token: item.address,
                    createdAt: createTime,
                    initLiquidityUsd: item.liquidity,
                    liquidityAddedAt: item.liquidityAddedAt,
                    bRenounced: true,
                    bNotRugged: true
                };

                let b_ret: any = await BaseNewPairMonitor.addNewAPI(newPair);
                // console.log(`============ b_ret := `, b_ret)
                if (b_ret) break                    
            }

            BaseNewPairMonitor.newPairs = BaseNewPairMonitor.pairs
            
        } catch (error) {
            console.log(`getNewPairsAPI fetching error`)

        }

        return BaseNewPairMonitor.newPairs.map(item => {
            // console.log(`======= NewPair time : `,new Date().toISOString(), item.liquidityAddedAt)
            const curtime = convertToEpochTime(new Date().toISOString().split('.')[0])
            let lifeTime = curtime - (item.createdAt || 0);
            // console.log(`========== life_time = `, lifeTime)

            let lifeTimeStr = '';
            lifeTime = Math.floor(lifeTime / 1000);
            if (lifeTime < 60) {
                lifeTimeStr = lifeTime + 's ago';
            } else if (lifeTime < 3600) {
                lifeTime = Math.floor(lifeTime / 60);
                lifeTimeStr = lifeTime + 'm ago';
            } else {
                lifeTime = Math.floor(lifeTime / 3600);
                lifeTimeStr = lifeTime + 'h ago';
            }
            return {
                token: item.token,
                name: item.name,
                symbol: item.symbol,
                lifeTime: lifeTimeStr,
                pool: item.pool,
                bRenounced: item.bRenounced,
                bNotRugged: item.bNotRugged,
                mcUsd: item.mcUsd,
                initLiquidityUsd: item.initLiquidityUsd
            };
        });
    },
    emptyPairs: function() {
        if (BaseNewPairMonitor.pairs.length)
        {
            BaseNewPairMonitor.pairs.splice(0, BaseNewPairMonitor.pairs.length)
        }
    }
};

export const chainNewPairWebsocket = (chainName: string) => {
    client = new WebSocketClient();    

    client.on('connectFailed', function (error:any) {
        console.log('NewPair Connect Error: ' + error.toString());
    });

    client.on('connect', async function (connection:any) {
        activeConnection = connection        
        console.log(`${chainName.toUpperCase()} NewPair WebSocket Client Connected`);

        connection.on('error', function (error:any) {
            console.log("NewPair Connection Error: " + error.toString());        
            connection.close()
        });
        connection.on('close', function () {
            console.log('echo-protocol : NewPair Connection Closed');
            setTimeout(connectBirdeyeWss, 1000)
        });
        connection.on('message', async function (message:any) {    
            
            // console.log(message)

            if (message.type === 'utf8') {
                let msgObj = null
                try {
                    msgObj = JSON.parse(message.utf8Data)
                } catch (error) {
                    console.log(error)
                }

                if(!msgObj || msgObj.type != 'TOKEN_NEW_LISTING_DATA') return
                const tx = msgObj.data
                
                if(Object.keys(tx).length) {                

                    // console.log("============>>>>>>>>>>> addNewPair := ")

                    const newPair: Pair = {
                        name: tx.name,
                        symbol: tx.symbol,
                        decimals: tx.decimals,
                        token: tx.address,
                        createdAt: Date.now(),
                        initLiquidityUsd: tx.liquidity,
                        liquidityAddedAt: tx.liquidityAddedAt,
                        bRenounced: true,
                        bNotRugged: true
                    };

                    BaseNewPairMonitor.addNew(newPair);
                    
                }

                // saveTokenTxnToDB(tx)
            }
        });

        const msg = {
            type: "SUBSCRIBE_TOKEN_NEW_LISTING",
        }
        connection.send(JSON.stringify(msg))
    });
    
    client.connect(WSS_TOKEN_URL, 'echo-protocol', "https://birdeye.so");

    return client
}

export const createChainWebSocket = (chain : string) : boolean => {
    if (chain == '') {
        console.log(`[createChainWebSocket] = chain is empty`)
        return false
    }
    
    WSS_TOKEN_URL = `wss://public-api.birdeye.so/socket/${chain}?x-api-key=${process.env.BIRDEYE_API_KEY}`

    if (activeConnection) 
    {
        console.log(`Previous Connection is closed`)
        closeWebSock()
    }
    else
    {
        console.log(`New websocke is created`);
        chainNewPairWebsocket(chain);
    }
    
    return true
}

export const connectBirdeyeWss = () => {    
    console.log(`[NewPair] Trying to connect BirdEye WSS: ${WSS_TOKEN_URL}`)
    client.connect(WSS_TOKEN_URL, 'echo-protocol', "https://birdeye.so");
}

export const closeWebSock =() => {
    try {
        BaseNewPairMonitor.emptyPairs();        
        if (activeConnection)
            activeConnection.close()        
        // delete client
        console.log("************* [NewPair] webclient is closed **********")
    } catch (error) {
        console.log(`[NewPair] : closeWebSock :=`, error)
    }
}

let prevConnectTimeMark = Math.floor(new Date().getMinutes() / 30)
export const checkReconnect = () => {
    let tmpTimeMark = Math.floor(new Date().getMinutes() / 30)  // reconnect per 30 minutes
    if(tmpTimeMark != prevConnectTimeMark) {
        try {
            if(activeConnection) activeConnection.close()
        } catch (error) {
            console.log(error)
        }
        prevConnectTimeMark = tmpTimeMark
    }
}

// chainNewPairWebsocket()
// connectBirdeyeWss()

// setInterval(checkReconnect, 60000)  // check reconnecting per 1 minutes
