

import {client as WebSocketClient, Message} from 'websocket';
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

import * as BirdeyeAPI from './birdeyeAPI'
import * as dexscreenerAPI from './dexscreenerAPI';
import { g_ChainMode } from './global';

// const CHAIN= 'base'
// const WSS_TOKEN_URL = `wss://public-api.birdeye.so/socket/${CHAIN}?x-api-key=${process.env.BIRDEYE_API_KEY}`

let WSS_TOKEN_URL: string = '';
let activeConnection: any = null;
let client: any = null;

interface Pair {
    token: string;
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
    volume24hUSD?: number;
    rank?: number;
}

//   {
//     "address": "D9paufRCehpk2YGRPkzJPEUDsvQjaTFKNyFDqgd4xqd",
//     "decimals": 6,
//     "liquidity": 545910.7824461614,
//     "logoURI": "https://img.fotofolio.xyz/?w=30&h=30&url=https%3A%2F%2Fi.postimg.cc%2FtCXbnSnK%2FIMG-3149.png",
//     "name": "Puffy",
//     "symbol": "PUFFY",
//     "volume24hUSD": 1687692.9393931455,
//     "rank": 1,
//     "price": 0.00016500988232798477
//   },

function convertToEpochTime(timestamp: string): number {
    const date = new Date(timestamp);
    const epochTime = Math.floor(date.getTime());
    return epochTime;
}

export const BaseTrendingTokenMonitor = {
    limit: 4,
    pairs: [] as Pair[],
    newPairs: [] as Pair[],
    ethPrice: 200,
    chainMode : 0,

    addNew: async function(pair: Pair) {
        // console.log('addNew: ' + pair.token)
        const existPairs = BaseTrendingTokenMonitor.pairs.filter(item => item.token === pair.token);
        // console.log(`aaaaaaaaaaaaa  ======== `, existPairs.length, BaseTrendingTokenMonitor.limit)
        if (existPairs.length > 0) 
        {
            console.log(`@@@@@@@@@ token already exist!`)
            return;
        }
            
        BaseTrendingTokenMonitor.pairs.push(pair);
        // console.log("===================", pair)
        let auditResult = await BaseTrendingTokenMonitor.checkAudit(pair)
        // retry once more checkAudit if result is false
        if(!auditResult) auditResult = await BaseTrendingTokenMonitor.checkAudit(pair)
        if(!auditResult) {
            BaseTrendingTokenMonitor.pairs.pop()
            return
        }
        // pair.wsClient = registerPriceWebsocket(pair.token);
        if (BaseTrendingTokenMonitor.pairs.length > BaseTrendingTokenMonitor.limit) {
            try {
                // if (NewPairMonitor.pairs[0].wsClient) {
                //     NewPairMonitor.pairs[0].wsClient.abort()
                // }
                // delete NewPairMonitor.pairs[0].wsClient;
                BaseTrendingTokenMonitor.pairs.splice(0, 1);
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
        const existPairs = BaseTrendingTokenMonitor.pairs.filter(item => item.token === newInfo.token);
        if (existPairs.length === 0) return;
        const targetPair = existPairs[0];
        // Update the target pair with new info if needed
    },
    getCurrentPairs: function() {
        return BaseTrendingTokenMonitor.pairs.map(item => {
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
        BaseTrendingTokenMonitor.chainMode = _chainMode
        BaseTrendingTokenMonitor.emptyPairs()
    },
    addNewAPI: async function(pair: Pair) {
        // console.log('+++++++++++++ addNew: ' + pair.token, BaseTrendingTokenMonitor.limit)
        // const existPairs = BaseTrendingTokenMonitor.pairs.filter(item => item.token === pair.token);
        // console.log(`aaaaaaaaaaaaa  ======== `, existPairs.length, BaseTrendingTokenMonitor.limit)
        // if (existPairs.length > 0) 
        // {
        //     console.log(`@@@@@@@@@ token already exist!`)
        //     return;
        // }
        
        BaseTrendingTokenMonitor.pairs.push(pair);
        // console.log("===================", pair)
        let auditResult = await BaseTrendingTokenMonitor.checkAudit(pair)
        if(!auditResult) {
            BaseTrendingTokenMonitor.pairs.pop()
            return false
        }

        if (BaseTrendingTokenMonitor.pairs.length > BaseTrendingTokenMonitor.limit) {
            let idx = BaseTrendingTokenMonitor.pairs.length
            BaseTrendingTokenMonitor.pairs.splice(idx-1, 1);
            return true
        }
        return false
    },    
    getTrendingTokenAPI: async function() {

        try {
            let chainMode: number = BaseTrendingTokenMonitor.chainMode
            let data:any = await BirdeyeAPI.getTrendingToken_Birdeye(chainMode)

            // console.log(`=========`, data)

            if (BaseTrendingTokenMonitor.pairs.length)
            {
                BaseTrendingTokenMonitor.pairs.splice(0, BaseTrendingTokenMonitor.pairs.length)
            }

            for (let i = 0; data && data.tokens && i < data.tokens.length; i++)
            {

                let item = data.tokens[i]
                if (!item || !item.symbol || !item.name) continue
                // if (BaseTrendingTokenMonitor.pairs.length == 4) break

                const poolInfo: any = await dexscreenerAPI.getPoolInfo(item.address, chainMode)
                if(!poolInfo || poolInfo.dex !== 'raydium') continue

                // console.log(`========= pool info`, poolInfo)

                let createTime = Date.now()//convertToEpochTime(item.liquidityAddedAt)
                // console.log(`========== create_time = `, createTime)

                const newPair: Pair = {
                    name: item.name,
                    symbol: item.symbol,
                    decimals: item.decimals,
                    token: item.address,
                    createdAt: createTime,
                    initLiquidityUsd: item.liquidity,
                    logUri: item.logoURI,
                    volume24hUSD: item.volume24hUSD,
                    price: item.price
                };

                let b_ret: any = await BaseTrendingTokenMonitor.addNewAPI(newPair);
                // console.log(`============ b_ret := `, b_ret)
                if (b_ret) break                    
            }

            BaseTrendingTokenMonitor.newPairs = BaseTrendingTokenMonitor.pairs
            
        } catch (error) {
            console.log(`getNewPairsAPI fetching error`)

        }

        return BaseTrendingTokenMonitor.newPairs.map(item => {
            // console.log(`======= NewPair time : `,new Date().toISOString(), item.liquidityAddedAt)
            const curtime = Date.now()//convertToEpochTime(new Date().toISOString().split('.')[0])
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
                decimals: item.decimals,
                volume24hUSD: item.volume24hUSD,
                logUri: item.logUri,
                price: item.price,
                liquidityUsd: item.initLiquidityUsd
            };
        });
    },
    emptyPairs: function() {
        if (BaseTrendingTokenMonitor.pairs.length)
        {
            BaseTrendingTokenMonitor.pairs.splice(0, BaseTrendingTokenMonitor.pairs.length)
        }
    }
};

// setInterval(checkReconnect, 60000)  // check reconnecting per 1 minutes
