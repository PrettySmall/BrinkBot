import WebSocket, { MessageEvent, ErrorEvent } from 'ws';
import dotenv from 'dotenv';
import axios from 'axios';
import {client as WebSocketClient, Message} from 'websocket';

import * as uniconst from './uniconst'
import { PoolkeysUpdater } from './solana/update_poolkeys';

dotenv.config();

const WSS_PRICE_URL = `wss://public-api.birdeye.so/socket/solana?x-api-key=${process.env.BIRDEYE_API_KEY}`;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

const RAYDIUM_AMM_PROG_ACCOUNT = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

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
}

interface TokenMetadata {
    name: string;
    symbol: string;
    uri: string;
}

interface TokenInfo {
    decimals: number;
    supply: number;
    mintAuthority: string;
    freezeAuthority: string;
}

export const NewPairMonitor = {
    limit: 4,
    pairs: [] as Pair[],
    solPrice: 200,
    addNew: async function(pair: Pair) {
        // console.log('addNew: ' + pair.token)
        const existPairs = NewPairMonitor.pairs.filter(item => item.token === pair.token);
        if (existPairs.length > 0) return;
        NewPairMonitor.pairs.push(pair);
        // console.log("===================", pair)
        let auditResult = await NewPairMonitor.checkAudit(pair)
        // retry once more checkAudit if result is false
        if(!auditResult) auditResult = await NewPairMonitor.checkAudit(pair)
        if(!auditResult) {
            NewPairMonitor.pairs.pop()
            return
        }
        PoolkeysUpdater.addNew(pair.token, pair.decimals!)
        // pair.wsClient = registerPriceWebsocket(pair.token);
        if (NewPairMonitor.pairs.length > NewPairMonitor.limit) {
            try {
                if (NewPairMonitor.pairs[0].wsClient) {
                    NewPairMonitor.pairs[0].wsClient.abort()
                }
                delete NewPairMonitor.pairs[0].wsClient;
                NewPairMonitor.pairs.splice(0, 1);
            } catch (error) {
                console.log(error);
            }
        }
    },
    checkAudit: async function(pair: Pair) {
        try {
            let response: any = null;
            let data: any = null;
            try {
                let query = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
                response = await axios.post(query, {
                    jsonrpc: "2.0",
                    id: "text",
                    method: "getAsset",
                    params: { id: pair.token}
                }, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                })

                // let query = `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY_BEAR}`                
                // response = await fetch(query, {
                //     method: 'POST',
                //     headers: {
                //       "Content-Type": "application/json"
                //     },
                //     body: {
                //         mintAccounts: [pair.token]
                //     },
                // });
                // data = await response.json();

                // console.log("============checkAudit : ", response.data)
                data = response.data.result
                if(!data || !data.token_info || !data.content || !data.content.metadata) {
                    return false
                }
            } catch (error) {
                console.log(error)
                return
            }
            
            // const tokenInfo = data[0].onChainAccountInfo.accountInfo.data.parsed.info
            // const metaInfo = data[0].onChainMetadata.metadata.data
            const tokenInfo = data.token_info
            const metaInfo = data.content.metadata

            pair.tokenAmount = pair.circleSupply! / (10 ** tokenInfo.decimals)
            pair.price = pair.mcUsd! / pair.tokenAmount
            pair.name = metaInfo.name
            pair.symbol = metaInfo.symbol
            if(metaInfo.symbol == undefined) return false
            pair.logUri = data.content.links.image
            pair.decimals = tokenInfo.decimals,
            pair.totalSupply = tokenInfo.supply / (10 ** tokenInfo.decimals),
            pair.bRenounced = tokenInfo.mint_authority == null,
            pair.bNotRugged = tokenInfo.freeze_authority == null
            // console.log(tokenInfo)
            return true
        } catch (err) {
            console.error("Error: ", err);
            return false
        }
    },
    updateTokenInfo: function(newInfo: Pair) {
        const existPairs = NewPairMonitor.pairs.filter(item => item.token === newInfo.token);
        if (existPairs.length === 0) return;
        const targetPair = existPairs[0];
        // Update the target pair with new info if needed
    },
    getCurrentPairs: function() {
        return NewPairMonitor.pairs.map(item => {
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
    }
};

function registerPriceWebsocket(address: string): WebSocketClient {
    const client = new WebSocketClient();

    client.on('connect', async function(connection) {
        connection.on('error', function(error) {
            connection.close();
        });
        connection.on('message', async function(message: Message) {
            if (message.type !== 'utf8') return;

            let msgObj: any = null;
            try {
                msgObj = JSON.parse(message.utf8Data);
            } catch (error) {
                console.log(error);
            }
            if (!msgObj || msgObj.type !== 'PRICE_DATA') return;

            if (msgObj.data.address === uniconst.WSOL_ADDRESS) {
                NewPairMonitor.solPrice = msgObj.data.c;
            } else {
                for (let i = 0; i < NewPairMonitor.pairs.length; i++) {
                    const item = NewPairMonitor.pairs[i];
                    if (item.token === msgObj.data.address) {
                        item.price = msgObj.data.c;
                        item.mcUsd = msgObj.data.c * item.tokenAmount!;
                    }
                }
            }
        });
        const msg = {
            type: "SUBSCRIBE_PRICE",
            data: {
                address: address,
                queryType: 'simple',
                chartType: '1m',
                currency: 'usd'
            }
        };
        connection.send(JSON.stringify(msg));
    });

    client.connect(WSS_PRICE_URL, 'echo-protocol', "https://birdeye.so");
    return client;
}

function getInitSolPrice() {
    const query = `https://public-api.birdeye.so/defi/price?address=${uniconst.WSOL_ADDRESS}`;
    try {
        axios.get(query, {
            headers: {
                'accept': 'application/json',
                'x-chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            }
        }).then(response => {
            if (response && response.data && response.data.data && response.data.success) {
                NewPairMonitor.solPrice = response.data.data.value;
            }
        });
    }
    catch (error)
    {
        console.log("getInitSolPrice error = ", error)	

    }    

    // registerPriceWebsocket("So11111111111111111111111111111111111111112");
}

// Function to send a request to the WebSocket server
function sendRequest(ws: WebSocket) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: [RAYDIUM_AMM_PROG_ACCOUNT] // account for Raydium’s AMM Program Address
            },
            {
                commitment: "confirmed",
                encoding: "jsonParsed",
                transactionDetails: "full",
                // showRewards: true,
                maxSupportedTransactionVersion: 0
            }
        ]
    };
    ws.send(JSON.stringify(request));
}

function initNewPairWebsocket() {
    let ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`);
    ws.on('open', function open() {
        console.log('Solana NewPair WebSocket is open');
        sendRequest(ws); // Send a request once the WebSocket is open
    });
    
    ws.on('message', function incoming(data: WebSocket.Data) {
        const messageStr = data.toString('utf8');
        try {
            const messageObj = JSON.parse(messageStr);
            if (!messageObj || !messageObj.params || !messageObj.params.result) return;
    
            const result = messageObj.params.result;
            if (!result.signature || !result.transaction) return;
    
            const signature = result.signature; // Extract the signature
            const logs = result.transaction.meta.logMessages;
    
            let initLogStr = logs.filter((log: string) => log.includes("initialize2: InitializeInstruction2"));
            if (initLogStr.length > 0) {
                initLogStr = initLogStr[0];
            } else {
                initLogStr = null;
            }
    
            if (logs && initLogStr) {
                const instructions = result.transaction.transaction.message.instructions;
                let ammInstruction = instructions.filter((item: any) => item.programId === RAYDIUM_AMM_PROG_ACCOUNT);
                if (ammInstruction.length > 0) ammInstruction = ammInstruction[0];
                const ammAccounts = ammInstruction.accounts;
                if(ammAccounts == undefined) return
    
                let pcAmountStr = initLogStr.match("init_pc_amount: (\\d+)");
                let coinAmountStr = initLogStr.match("init_coin_amount: (\\d+)");
                if (pcAmountStr && pcAmountStr.length > 0) pcAmountStr = pcAmountStr[0].replace("init_pc_amount: ", "");
                if (coinAmountStr && coinAmountStr.length > 0) coinAmountStr = coinAmountStr[0].replace("init_coin_amount: ", "");
                const pcAmount = parseInt(pcAmountStr);
                const coinAmount = parseInt(coinAmountStr);
    
                let token = ammAccounts[8];
                let solAmount = pcAmount / (10 ** 9);
                let circleSupply = coinAmount;
                if (token.includes('So11111111111111111111111111111111111111112')) {
                    token = ammAccounts[9];
                    solAmount = coinAmount / (10 ** 9);
                    circleSupply = pcAmount;
                }
    
                const newPair: Pair = {
                    tx: signature,
                    pool: ammAccounts[4],
                    owner: ammAccounts[17],
                    token,
                    createdAt: Date.now(),
                    solAmount,
                    circleSupply,
                    mcUsd: solAmount * NewPairMonitor.solPrice,
                    initLiquidityUsd: 2 * solAmount * NewPairMonitor.solPrice
                };
    
                NewPairMonitor.addNew(newPair);
            }
    
        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }
    });
    
    ws.on('error', function error(err: ErrorEvent) {
        console.error('WebSocket error:', err);
    });
    
    ws.on('close', function close() {
        console.log('WebSocket is closed');
        ws.terminate();
        // ws.close();
        // ws.removeAllListeners();
        // ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`);
        // console.log('WebSocket is being recreated')
        initNewPairWebsocket()
    });
}

// initNewPairWebsocket() // bot error ???

// getInitSolPrice();

// setInterval(function() {
//     console.log(NewPairMonitor.getCurrentPairs());
// }, 2000);

// export { NewPairMonitor };
