import * as bot from '../bot';
import * as utils from './utils_base';

import * as uniconst from './uni-catch/const';
import * as afx from './global_base';

import * as birdeyeAPI from '../birdeyeAPI'
import * as multichainAPI from '../multichainAPI'

import dotenv from 'dotenv';

dotenv.config();

const calcFee = (amount: number) => {
    const swapFeeAmount = amount * afx.Swap_Fee_Percent / 100.0;
    const refRewardAmount = swapFeeAmount * afx.Reward_Percent / 100.0;
    return { swapFeeAmount, refRewardAmount };
};

export const start = (web3: any, database: any, bot: any) => {
    console.log('Swapbot daemon has been started...');
    startRewardPayer(web3, database, bot, 1000);
};

const startRewardPayer = (web3: any, database: any, bot: any, interval: number) => {
    setTimeout(() => {
        rewardPayerThread(web3, database, bot);
    }, interval);
};

const isDoneTodayReward = (database: any): boolean => {
    const env = database.getEnv();
    if (!env.last_reward_time) {
        return false;
    }

    const lastRewardDate = new Date(env.last_reward_time);
    const currentDate = new Date();

    if (lastRewardDate.getTime() > currentDate.getTime()) {
        return true;
    }

    if (lastRewardDate.getUTCFullYear() === currentDate.getUTCFullYear() &&
        lastRewardDate.getUTCMonth() === currentDate.getUTCMonth() &&
        lastRewardDate.getUTCDay() === currentDate.getUTCDay()) {
        return true;
    }

    return false;
};

export const rewardPayerThread = async (web3: any, database: any, bot: any) => {
    if (!isDoneTodayReward(database)) {
        await sendReward(web3, database, (msg: string) => {
            bot.sendInfoMessage(afx.Owner_Chatid, msg);
        });
    }

    startRewardPayer(web3, database, bot, 1000 * 60 * 10);
};

export const sendReward = async (web3: any, database: any, sendMsg: (msg: string) => void) => {
    console.log('sendReward func todo');
    // const rewards = await database.selectRewards({ amount: { $gt: 0 } });

    // let rewardWallets: string[] = [];
    // let values: any[] = [];
    // let chatids: string[] = [];
    // let sum = web3.utils.toBN(0);
    // for (const item of rewards) {
    //     if (item.amount >= afx.get_reward_heap()) {
    //         const session = bot.sessions.get(item.chatid);
    //         if (session.reward_wallet) {
    //             chatids.push(item.chatid);
    //             rewardWallets.push(session.reward_wallet);
    //             const reward = utils.toBNe18(web3, item.amount);
    //             values.push(reward);
    //             sum = sum.add(reward);
    //         } else {
    //             console.log(`@${session.username} has been skipped rewarding due to no wallet assigned`);
    //         }
    //     }
    // }

    // if (values.length === 0) {
    //     // sendMsg(`No pending rewards`);
    //     return;
    // }

    // await withdrawToUsers(web3, rewardWallets, values, sum, sendMsg, async (res) => {
    //     if (res.status === 'success') {
    //         for (let i = 0; i < chatids.length; i++) {
    //             const wallet = rewardWallets[i];
    //             const value = values[i];
    //             const chatid = chatids[i];
    //             await database.addRewardHistory(chatid, wallet, value, res.txHash);
    //         }
    //         database.updateEnv({ last_reward_time: new Date() });
    //     }
    // });
};

export const buyToken = async (web3: any, database: any, sessionId: any, tokenAddress: string, buyAmount: number, unit: string, ver: string, sendMsg: Function, callback: ((result: any) => void) | null = null) => {

    const session: any = bot.sessions.get(sessionId)
    if (!session)
    {
        console.log(`[buyToken-${sessionId}] : Session is expired`)
        return false
    }

    let msg: any = await bot.sendMessage(sessionId, '🚀 Starting Buy Swap...');

    if (!session.baseDepositWallet) {
        console.log(`❗ Buy Swap failed: No wallet attached.`);
        return false;
    }

    const privateKey = session.baseDepositWallet; //utils.decryptPKey(session.baseDepositWallet); // Encrypte private key

    if (!privateKey) {
        console.log(`[buySwap] ${session.username} wallet error`);
        // sendMsg(`❗ Buy Swap failed: Invalid wallet.`);
        return false;
    }

    let wallet: any = null;
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        console.log(`❗ Buy Swap failed: ${error}`);
        return false;
    }

    if (!web3.utils.isAddress(wallet.address)) {
        console.log(`❗ Buy Swap failed: Invalid wallet 2.`);
        return false;
    }

    const token: any = await database.selectToken({ chatid: sessionId, addr:tokenAddress, chainID: session.lastUsedChainMode })

    // console.log(`--------------------- token info : = ${JSON.stringify(token)}`)

    const data: any = await birdeyeAPI.getTokenPriceInfo_Birdeye(tokenAddress, session.lastUsedChainMode)
    if(data && data.value) token.buyPrice = data.value

    console.log("current token price = $", token.buyPrice)

    let tokenContract: any = null;
    let tokenDecimals: number | null = null;
    let tokenSymbol: string | null = null;

    try {
        tokenContract = new web3.eth.Contract(afx.get_ERC20_abi(), tokenAddress);
        tokenDecimals = await tokenContract.methods.decimals().call();
        tokenSymbol = await tokenContract.methods.symbol().call();
    } catch (error) {
        console.log("Buy Swap failed : Invalid tokenContract.", error);
        // sendMsg(`❗ Buy Swap failed: Invalid tokenContract.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Buy Swap failed : Invalid tokenContract.`)
        return false;
    }

    let routerContract: any = null;
    try {
        routerContract = new web3.eth.Contract(afx.get_uniswapv2_router_abi(), afx.get_uniswapv2_router_address());
    } catch (error) {
        console.log(`❗ Buy Swap failed: Invalid routerContract.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Buy Swap failed: Invalid routerContract.`)
        return false;
    }

    let slippage:any = token.buySlippage ? token.buySlippage : 5; // session.wallets[session.wallets_index].snipe_buy_slippage ? session.wallets[session.wallets_index].snipe_buy_slippage : 5;
    
    console.log(`========= buy slippage := ${slippage}`)
    let rawEthAmount: any = null;
    let rawEthBalance: any = null;
    let rawEthPlusGasAmount: any = null;
    let rawTokenAmountsOut: any = null;

    await bot.switchMessage(sessionId, msg.messageId, `estimateGasPrice fetching ...`)

    const gasTotalPrice = await utils.getGasPrices(web3);
    const estimateGasPrice = gasTotalPrice.high;
    // const gasPrice = gasTotalPrice.medium;
    const gasPrice = gasTotalPrice.high;
    let maxFeePerGas = gasTotalPrice.high;

    console.log(`[buyToken] ------------- gasPrice(medium) = ${gasPrice}, estimateGasPrice(high) = ${estimateGasPrice}`)
    
    const swapPath = [afx.get_weth_address(), tokenAddress];

    if (unit === afx.get_chain_symbol()) {
        try {
            rawEthAmount = utils.toBNe18(web3, buyAmount);
            const amountsOut = await routerContract.methods.getAmountsOut(rawEthAmount, swapPath).call();
            rawTokenAmountsOut = web3.utils.toBN(amountsOut[1]);

            console.log(`[buyToken] -----------rawTokenAmountOut := ${rawTokenAmountsOut}`)
        } catch (error) {
            console.log(`❗ Buy Swap failed: valid check. [1]`);
            await bot.switchMessage(sessionId, msg.messageId, `❗ Buy Swap failed: valid check. [1]`)
            return false;
        }
    } else {
        try {
            rawTokenAmountsOut = web3.utils.toBN(buyAmount * 10 ** tokenDecimals!);
            const amountsIn = await routerContract.methods.getAmountsIn(rawTokenAmountsOut, swapPath).call();
            rawEthAmount = web3.utils.toBN(amountsIn[0]);
        } catch (error) {
            console.log(`❗ Buy Swap failed: valid check. [2]`);
            return false;
        }
    }

    console.log('🚀 Starting Buy Swap...');
    await bot.switchMessage(sessionId, msg.messageId, `🚀 Starting Buy Swap...`)
    
    try {
        // const deadline = parseInt(Date.now() / 1000 + 1800);
        const deadline = Math.floor(Date.now() / 1000) + 1800;
        let swapTx: any = null;
        let estimatedGas: any = null;
        let router_address: string | null = null;

        console.log(`================= buy slippage := ${slippage}`)

        swapTx = routerContract.methods.swapExactETHForTokensSupportingFeeOnTransferTokens(
            rawTokenAmountsOut.muln(100 - slippage).divn(100).toString(),
            swapPath,
            wallet.address,
            deadline
        );
        router_address = afx.get_uniswapv2_router_address();

        console.log(`--------------------swapExactETHForTokens is passed`)

        const encodedSwapTx = swapTx.encodeABI();
        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);

        console.log(`--------------------getTransactionCount is passed`)

        await bot.switchMessage(sessionId, msg.messageId, `Swap transaction nonce fetching...`)

        try {
            estimatedGas = await swapTx.estimateGas({
                from: wallet.address, to: router_address,
                value: rawEthAmount.toString(), data: encodedSwapTx
            });

            console.log("======================estimatedGas result", estimatedGas);
            estimatedGas = Number(estimatedGas + 300_000);//No how ???
        } catch (error) {
            console.log("[buyToken] : GetGasEstimated error");
            estimatedGas = uniconst.DEFAULT_ETH_GAS;
        }

        const swapFee = calcFee(buyAmount);
        const rawSwapFee = utils.toBNeN(web3, swapFee.swapFeeAmount, 9);

        try {
            rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));
            rawEthPlusGasAmount = estimateGasPrice.muln(estimatedGas).add(rawEthAmount).add(rawSwapFee);

            console.log("==================balance", rawEthBalance.toString(), rawEthPlusGasAmount.toString());
            if (rawEthBalance.lt(rawEthPlusGasAmount)) {
                console.log(`Sorry, Insufficient ${afx.get_chain_symbol()} balance!
    🚫 Required max ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthPlusGasAmount / 10 ** 18, 5)} ${afx.get_chain_symbol()}
    🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 ** 18, 5)} ${afx.get_chain_symbol()}`);

                await bot.switchMessage(sessionId, msg.messageId, `Sorry, Insufficient ${afx.get_chain_symbol()} balance!
    🚫 Required max ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthPlusGasAmount / 10 ** 18, 5)} ${afx.get_chain_symbol()}
    🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 ** 18, 5)} ${afx.get_chain_symbol()}`)

                return false;
            }
        } catch (error) {
            console.log(`❗ Buy Swap failed: valid check.`);
            await bot.switchMessage(sessionId, msg.messageId, `❗ Buy Swap failed: valid check.`)
            return false;
        }
        
        const transEthAmt = parseInt(session.referred_by) === 0 ? rawEthAmount : rawEthAmount.add(rawSwapFee);
        const tx = {
            from: wallet.address,
            to: router_address,
            gasLimit: estimatedGas,
            baseFeePerGas: gasPrice,
            value: transEthAmt.toString(),
            data: encodedSwapTx,
            nonce,
        };

        console.log("=====================Buy Transaction=========================", tx)

        const tokenAmount = rawTokenAmountsOut / (10 ** tokenDecimals!);
        const signedTx = await wallet.signTransaction(tx);

        console.log(`🔖 Swap Info
  └─ ${afx.get_chain_symbol()} Amount: ${utils.roundEthUnit(buyAmount, 5)}
  └─ Estimated Amount: ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}
  └─ Gas Price: ${utils.roundDecimal(gasPrice / (10 ** 9), 5)} GWEI
  └─ Swap Fee: ${utils.roundEthUnit(swapFee.swapFeeAmount, 9)} (${utils.roundDecimal(afx.Swap_Fee_Percent, 2)} %)`);

        await bot.switchMessage(sessionId, msg.messageId, `🔖 Swap Info
  └─ ${afx.get_chain_symbol()} Amount: ${utils.roundEthUnit(buyAmount, 5)}
  └─ Estimated Amount: ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}
  └─ Gas Price: ${utils.roundDecimal(gasPrice / (10 ** 9), 5)} GWEI
  └─ Swap Fee: ${utils.roundEthUnit(swapFee.swapFeeAmount, 9)} (${utils.roundDecimal(afx.Swap_Fee_Percent, 2)} %)`)
  
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash:string) {
                // let txLink = utils.getFullTxLink(afx.get_chain_id(), hash);
                console.log('Waiting...');
                
                let url = hash
                console.log(`⌛ Pending Buy transaction...... \n${multichainAPI.get_chainscan_url(url, session.lastUsedChainMode)}`)
                await bot.switchMessage(sessionId, msg.messageId, `⌛ Pending Buy transaction......`)

            })
            .on('receipt', async function (tx: any) {
                // sendMsg(`🟢 You've purchased ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}`);

                let url = tx.transactionHash

                let scanUrl = multichainAPI.get_chainscan_url(url, session.lastUsedChainMode)
                console.log(`${scanUrl}`);

                let scanName = multichainAPI.get_scan_url(session.lastUsedChainMode)

                await bot.removeMessage(msg.chatid, msg.messageId)
                await sendMsg(`✅ Successfully [${token.symbol}] Token Buy done! <a href="${scanUrl}">View on ${scanName}</a>`)
                
                token.buyCount += 1;
                token.buyHistory += token.buyAmount;
                await token.save()

                let rawTaxSwapFee = utils.toBNe18(web3, swapFee.swapFeeAmount);// 'ether'
                await transferEth(web3, session.baseDepositWallet, String(process.env.BASE_TAX_WALLET), rawTaxSwapFee, 'VALUE')
                
                if (session.referredBy && swapFee.refRewardAmount) {
                    let rawTaxRefFee = utils.toBNe18(web3, swapFee.refRewardAmount);
                    let refUser = await database.selectUser({chatid:session.referredBy});
                    let refWallet = web3.eth.accounts.privateKeyToAccount(refUser.baseDepositWallet);

                    await transferEth(web3, session.baseDepositWallet, String(refWallet.address), rawTaxRefFee, 'VALUE')

                    // await sendReward(web3, database, (msg) => {
                    //     bot.sendInfoMessage(afx.Owner_Chatid, msg);
                    // });
                }
                
                // if (callback) {
                //     callback({
                //         status: 'success',
                //         txHash: tx.transactionHash,
                //         ethAmount: (rawEthAmount / 10 ** 18),
                //         tokenAmount: tokenAmount
                //     });
                // }
            })
            .on('error', function (error: any, receipt: any) {
                bot.sendInfoMessage(sessionId, '❗ Transaction failed.');
                console.log(`Transaction error := `, error.toString());
                if (callback) {
                    callback({
                        status: 'failed',
                        // txHash: tx.transactionHash
                    });
                }
            });
        return true;
    } catch (error) {
        console.log(`😢 Sorry, token's tax is high. It seems you might need to increase the slippage.`);
        await bot.sendInfoMessage(sessionId, `😢 Sorry, token's tax is high. It seems you might need to increase the slippage.`);
        if (callback) {
            callback({ status: 'error' });
        }
        return false;
    }
};

// export const buyToken = async (
//     web3: any,
//     database: any,
//     sessionId: any,
//     tokenAddress: string,
//     buyAmount: number,
//     unit: string,
//     ver: string,
//     sendMsg: Function,
//     callback: ((result: any) => void) | null = null
//   ) => {
//     const session: any = bot.sessions.get(sessionId);
//     if (!session) {
//       console.log(`[buyToken-${sessionId}] : Session is expired`);
//       return false;
//     }
  
//     if (!session.baseDepositWallet) {
//       console.log("❗ Buy Swap failed: No wallet attached.");
//       return false;
//     }
  
//     const privateKey = session.baseDepositWallet;
  
//     if (!privateKey) {
//       console.log(`[buySwap] ${session.username} wallet error`);
//       return false;
//     }
  
//     let wallet: any = null;
//     try {
//       wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
//     } catch (error) {
//       console.log(`❗ Buy Swap failed: ${error}`);
//       return false;
//     }
  
//     if (!web3.utils.isAddress(wallet.address)) {
//       console.log("❗ Buy Swap failed: Invalid wallet address.");
//       return false;
//     }
  
//     const token: any = await database.selectToken({ chatid: sessionId, addr: tokenAddress, chainID: session.lastUsedChainMode });
  
//     const data: any = await birdeyeAPI.getTokenPriceInfo_Birdeye(tokenAddress, session.lastUsedChainMode);
//     if (data && data.value) token.buyPrice = data.value;
  
//     console.log("current token price = $", token.buyPrice);
  
//     let tokenContract: any = null;
//     let tokenDecimals: number | null = null;
//     let tokenSymbol: string | null = null;
  
//     try {
//       tokenContract = new web3.eth.Contract(afx.get_ERC20_abi(), tokenAddress);
//       tokenDecimals = await tokenContract.methods.decimals().call();
//       tokenSymbol = await tokenContract.methods.symbol().call();
//     } catch (error) {
//       console.log("Buy Swap failed: Invalid tokenContract.", error);
//       return false;
//     }
  
//     let routerContract: any = null;
//     try {
//       routerContract = new web3.eth.Contract(afx.get_uniswapv2_router_abi(), afx.get_uniswapv2_router_address());
//     } catch (error) {
//       console.log("❗ Buy Swap failed: Invalid routerContract.");
//       return false;
//     }
  
//     let slippage: any = token.buySlippage ? token.buySlippage : 5;
  
//     console.log(`========= buy slippage := ${slippage}`);
//     let rawEthAmount: any = null;
//     let rawEthBalance: any = null;
//     let rawEthPlusGasAmount: any = null;
//     let rawTokenAmountsOut: any = null;
  
//     const gasTotalPrice = await utils.getGasPrices(web3);
//     const estimateGasPrice = gasTotalPrice.high;
//     const gasPrice = gasTotalPrice.high;
//     let maxFeePerGas = gasTotalPrice.high;
  
//     console.log(`[buyToken] ------------- gasPrice(high) = ${gasPrice}, estimateGasPrice(high) = ${estimateGasPrice}`);
  
//     const swapPath = [afx.get_weth_address(), tokenAddress];
  
//     if (unit === afx.get_chain_symbol()) {
//       try {
//         rawEthAmount = utils.toBNe18(web3, buyAmount);
//         const amountsOut = await routerContract.methods.getAmountsOut(rawEthAmount, swapPath).call();
//         rawTokenAmountsOut = web3.utils.toBN(amountsOut[1]);
  
//         console.log(`[buyToken] -----------rawTokenAmountOut := ${rawTokenAmountsOut}`);
//       } catch (error) {
//         console.log("❗ Buy Swap failed: valid check. [1]");
//         return false;
//       }
//     } else {
//       try {
//         rawTokenAmountsOut = web3.utils.toBN(buyAmount * 10 ** tokenDecimals!);
//         const amountsIn = await routerContract.methods.getAmountsIn(rawTokenAmountsOut, swapPath).call();
//         rawEthAmount = web3.utils.toBN(amountsIn[0]);
//       } catch (error) {
//         console.log("❗ Buy Swap failed: valid check. [2]");
//         return false;
//       }
//     }
  
//     console.log("🚀 Starting Buy Swap...");
  
//     try {
//       const deadline = Math.floor(Date.now() / 1000) + 1800;
//       let swapTx: any = null;
//       let estimatedGas: any = null;
//       let router_address: string | null = null;
  
//       console.log(`================= buy slippage := ${slippage}`);
  
//       swapTx = routerContract.methods.swapExactETHForTokensSupportingFeeOnTransferTokens(
//         rawTokenAmountsOut.muln(100 - slippage).divn(100).toString(),
//         swapPath,
//         wallet.address,
//         deadline
//       );
//       router_address = afx.get_uniswapv2_router_address();
  
//       console.log("--------------------swapExactETHForTokens is passed");
  
//       const encodedSwapTx = swapTx.encodeABI();
//       let nonce = await web3.eth.getTransactionCount(wallet.address, "pending");
//       nonce = web3.utils.toHex(nonce);
  
//       console.log("--------------------getTransactionCount is passed");
  
//       try {
//         estimatedGas = await swapTx.estimateGas({
//           from: wallet.address,
//           to: router_address,
//           value: rawEthAmount.toString(),
//           data: encodedSwapTx,
//         });
  
//         console.log("======================estimatedGas result", estimatedGas);
//         estimatedGas = Number(estimatedGas.toString());
//       } catch (error) {
//         console.log("[buyToken] : GetGasEstimated error");
//         estimatedGas = uniconst.DEFAULT_ETH_GAS;
//       }
  
//       const swapFee = calcFee(buyAmount);
//       const rawSwapFee = utils.toBNeN(web3, swapFee.swapFeeAmount, 9);
  
//       try {
//         rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));
//         rawEthPlusGasAmount = estimateGasPrice.muln(estimatedGas).add(rawEthAmount).add(rawSwapFee);
  
//         console.log("==================balance", rawEthBalance.toString(), rawEthPlusGasAmount.toString());
//         if (rawEthBalance.lt(rawEthPlusGasAmount)) {
//           console.log(
//             `Sorry, Insufficient ${afx.get_chain_symbol()} balance!\n🚫 Required max ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthPlusGasAmount / 10 ** 18, 5)} ${afx.get_chain_symbol()}\n🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 ** 18, 5)} ${afx.get_chain_symbol()}`
//           );
//           return false;
//         }
//       } catch (error) {
//         console.log("❗ Buy Swap failed: valid check.");
//         return false;
//       }
  
//       const transEthAmt = parseInt(session.referred_by) === 0 ? rawEthAmount : rawEthAmount.add(rawSwapFee);
//       const tx = {
//         from: wallet.address,
//         to: router_address,
//         gasLimit: estimatedGas,
//         baseFeePerGas: gasPrice,
//         value: transEthAmt.toString(),
//         data: encodedSwapTx,
//         nonce,
//       };
  
//       console.log("=====================Buy Transaction=========================", tx);
  
//       const tokenAmount = rawTokenAmountsOut / 10 ** tokenDecimals!;
//       const signedTx = await wallet.signTransaction(tx);
  
//       console.log(`🔖 Swap Info\n  └─ ${afx.get_chain_symbol()} Amount: ${utils.roundEthUnit(buyAmount, 5)}\n  └─ Estimated Amount: ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}\n  └─ Gas Price: ${utils.roundDecimal(gasPrice / 10 ** 9, 5)} GWEI\n  └─ Swap Fee: ${utils.roundEthUnit(swapFee.swapFeeAmount, 9)} (${utils.roundDecimal(afx.Swap_Fee_Percent, 2)} %)`);
  
//       await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
//         .on("transactionHash", async function (hash: string) {
//           console.log("Waiting...");
//           let url = hash;
//           console.log(`⌛ Pending Buy transaction...... \n${multichainAPI.get_chainscan_url(url, session.lastUsedChainMode)}`);
//         })
//         .on("receipt", async function (tx: any) {
//           let rawTaxSwapFee = utils.toBNe18(web3, swapFee.swapFeeAmount);
//           await transferEth(web3, session.baseDepositWallet, String(process.env.BASE_TAX_WALLET), rawTaxSwapFee, "VALUE");
  
//           let url = tx.transactionHash;
//           let scanUrl = multichainAPI.get_chainscan_url(url, session.lastUsedChainMode);
//           console.log(`${scanUrl}`);
  
//           await sendMsg(`✅ Successfully [${token.symbol}] Token Buy done! <a href="${scanUrl}">View on Scan</a>`, {
//             parse_mode: "HTML",
//           });
//         })
//         .on("error", async function (error: any) {
//           console.log(`⚠️ <b>[ ${afx.get_chain_symbol()} Buy Error ]</b> ${error}`);
//           return false;
//         });
//     } catch (error) {
//       console.log(`⚠️ Buy Swap failed! ${error}`);
//       return false;
//     }
//   };
  
export const sellToken = async (web3: any, database: any, sessionId: any, tokenAddress: string, sellAmount: number, unit: string, ver: string, sendMsg: Function, callback: ((result: any) => void) | null = null): Promise<boolean> => {
    const session: any = bot.sessions.get(sessionId)
    if (!session)
    {
        console.log(`[sellToken-${sessionId}] : Session is expired`)
        return false
    }

    let msg: any = await bot.sendMessage(sessionId, 'sell token starting ...');

    if (!session.baseDepositWallet) {
        sendMsg(`❗ Sell Swap failed: No wallet attached.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: No wallet attached.`)
        return false;
    }

    // const privateKey = utils.decryptPKey(session.pkey);
    const privateKey = session.baseDepositWallet; //utils.decryptPKey(session.baseDepositWallet); // Encrypte private key

    if (!privateKey) {
        sendMsg(`❗ Sell Swap failed: Invalid wallet.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: Invalid wallet.`)
        return false;
    }

    // console.log(privateKey);

    let wallet: any = null;
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        // console.log(error);
        sendMsg(`❗ Sell Swap failed: ${error}`);
        return false;
    }

    if (!web3.utils.isAddress(wallet.address)) {
        sendMsg(`❗ Sell Swap failed: Invalid wallet 2.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: Invalid wallet 2.`)
        return false;
    }

    const token: any = await database.selectToken({ chatid: sessionId, addr:tokenAddress, chainID: session.lastUsedChainMode })

    let tokenContract: any = null;
    let tokenDecimals: number | null = null;
    let tokenSymbol: string | null = null;

    try {
        tokenContract = new web3.eth.Contract(afx.get_ERC20_abi(), tokenAddress);
        tokenDecimals = await tokenContract.methods.decimals().call();
        tokenSymbol = await tokenContract.methods.symbol().call();
    } catch (error) {
        console.error(error);
        sendMsg(`❗ Sell Swap failed: Invalid tokenContract.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: Invalid tokenContract.`)
        return false;
    }

    let slippage: number | null = null;
    let rawTokenAmount: any = null;
    let rawTokenBalance: any = null;

    try {
        slippage = token.sellSlippage ? token.sellSlippage : 20; // session.wallets[session.wallets_index].snipe_sell_slippage ? session.wallets[session.wallets_index].snipe_sell_slippage : 5;
        rawTokenBalance = web3.utils.toBN(await tokenContract.methods.balanceOf(wallet.address).call());

        if (unit === 'PERCENT') {
            rawTokenAmount = rawTokenBalance.muln(sellAmount).divn(100);
            sellAmount = rawTokenAmount / (10 ** tokenDecimals!);
        } else {
            rawTokenAmount = utils.toBNeN(web3, sellAmount, tokenDecimals!);
        }
    } catch (error) {
        sendMsg(`❗ Sell Swap failed: Invalid raw Data.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: Invalid raw Data.`)
        return false;
    }
    const totalGasPrice = await utils.getGasPrices(web3);
    // const gasPrice = totalGasPrice.medium;
    const gasPrice = totalGasPrice.high;
    let maxFeePerGas = totalGasPrice.high;
    const estimatedGasPrice = maxFeePerGas;
    // maxFeePerGas = session.wallets[session.wallets_index].snipe_max_gas_price > maxFeePerGas ? afx.GWEI.mul(session.wallets[session.wallets_index].snipe_max_gas_price) : maxFeePerGas;

    let needApprove = true;
    let rawEthBalance = web3.utils.toBN("0");
    try {
        rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));

        const rawTokenAllowance = web3.utils.toBN(await tokenContract.methods.allowance(wallet.address, afx.get_uniswapv2_router_address()).call());

        console.log("Token Allowance =", rawTokenAllowance.toString());
        console.log("Token Amount = ", rawTokenAmount.toString());
        console.log("Token Balance = ", rawTokenBalance.toString());

        // balance validate
        if (rawTokenBalance.isZero() || rawTokenBalance.lt(rawTokenAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient ${tokenSymbol} token balance!

🚫 Required ${tokenSymbol} token balance: ${utils.roundDecimal(sellAmount, 5)} ${tokenSymbol}
🚫 Your ${tokenSymbol} token balance: ${utils.roundDecimal(rawTokenBalance, 5)} ${tokenSymbol}`);

            await bot.switchMessage(sessionId, msg.messageId, `🚫 Sorry, Insufficient ${tokenSymbol} token balance!`)
            return false;
        }

        // allowance validate
        if (rawTokenAllowance.gte(rawTokenAmount)) {
            needApprove = false;
        }
    } catch (error) {
        // console.log(error);
        sendMsg(`❗ Sell Swap failed: valid check.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: valid check.`)
        return false;
    }

    console.log("needApprove=", needApprove);

    if (needApprove) {
        try {
            const approveTx = tokenContract.methods.approve(
                afx.get_uniswapv2_router_address(),
                // '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                rawTokenAmount.toString()
            );

            console.log(`============= approveTx generating... := ${approveTx}`)

            await bot.switchMessage(sessionId, msg.messageId, `⌛ approveTx generating......`)

            const encodedApproveTx = approveTx.encodeABI();
            let estimatedGas: any;
            try {
                estimatedGas = await approveTx.estimateGas({
                    from: wallet.address, to: tokenAddress,
                    value: 0, data: encodedApproveTx
                });

                estimatedGas = Number(estimatedGas.toString());

                console.log(`============= estimateGas generating... := ${estimatedGas}`)
            } catch (error:any) {
                console.log("needApprove -> GetGasEstimate error : ", error.toString());
                estimatedGas = uniconst.DEFAULT_ETH_GAS; // session.wallets[session.wallets_index].snipe_max_gas_limit > uniconst.DEFAULT_ETH_GAS ? session.wallets[session.wallets_index].snipe_max_gas_limit : uniconst.DEFAULT_ETH_GAS;
            }

            await bot.switchMessage(sessionId, msg.messageId, `⌛ estimateGas generating ......`)

            const rawGasAmount = estimatedGasPrice.muln(estimatedGas);
            if (rawEthBalance.lt(rawGasAmount)) {
                await sendMsg(`🚫 Sorry, Insufficient Transaction fee balance!

🚫 Required max fee balance: ${utils.roundDecimal(rawGasAmount / 10 ** 18, 8)} ${afx.get_chain_symbol()}
🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 ** 18, 8)} ${afx.get_chain_symbol()}`);

                await bot.switchMessage(sessionId, msg.messageId, `🚫 Sorry, Insufficient Transaction fee balance!`)
                return false;
            }

            let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
            nonce = web3.utils.toHex(nonce);

            console.log(`------------------- nonce generating ... := ${nonce}`)
            await bot.switchMessage(sessionId, msg.messageId, `⌛ nonce generating ......`)

            const tx = {
                from: wallet.address,
                to: tokenAddress,
                gasLimit: estimatedGas,
                baseFeePerGas: gasPrice,
                // maxFeePerGas: maxFeePerGas,
                data: encodedApproveTx,
                value: 0,
                nonce,
            };

            await bot.switchMessage(sessionId, msg.messageId, `⌛ approve tx sign & send transaction ......`)

            const signedTx = await wallet.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log(`==================== approve tx sign & send transaction := ${JSON.stringify(signedTx.rawTransaction)}`)
            
        } catch (error) {
            console.log(error);
            sendMsg(`❗ Sell Swap failed: Approve Fail.`);
            await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: Approve Fail ......`)
            return false;
        }
    }

    let routerContract: any = null;
    try {
        routerContract = new web3.eth.Contract(afx.get_uniswapv2_router_abi(), afx.get_uniswapv2_router_address());
    } catch (error) {
        sendMsg(`❗ Sell Swap failed: Invalid routerContract.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: Invalid routerContract.`)
        return false;
    }

    sendMsg('🚀 Starting Sell Swap...');
    await bot.switchMessage(sessionId, msg.messageId, `🚀 Starting Sell Swap ......`)

    let rawEthAmountsOut: any = null;

    const swapPath = [tokenAddress, afx.get_weth_address()];

    try {
        const amountsOut = await routerContract.methods.getAmountsOut(rawTokenAmount, swapPath).call();

        rawEthAmountsOut = web3.utils.toBN(amountsOut[1]);
    } catch (error) {
        // console.log(error);
        sendMsg(`❗ Sell Swap failed: getAmountsOut check.`);
        await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: getAmountsOut check.`)
        return false;
    }

    console.log(`rawEthAmountOut := ${rawEthAmountsOut.toString()}`)

    try {
        // const deadline = parseInt(Date.now() / 1000 + 1800); // parseInt(session.deadline ? Date.now() / 1000 + session.deadline : Date.now() / 1000 + 1800);
        const deadline = Math.floor(Date.now() / 1000 + 1800); 

        let swapTx: any = null;
        let estimatedGas: any = null;
        if (false) // afx.get_chain_id() === afx.Avalanche_ChainId)
        {
            swapTx = routerContract.methods.swapExactTokensForAVAXSupportingFeeOnTransferTokens(
                rawTokenAmount.toString(),
                rawEthAmountsOut.muln(100 - slippage!).divn(100).toString(),
                swapPath,
                wallet.address,
                deadline
            );
        } else {
            swapTx = routerContract.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
                rawTokenAmount.toString(),
                rawEthAmountsOut.muln(100 - slippage!).divn(100).toString(),
                swapPath,
                wallet.address,
                deadline
            );
        }

        const encodedSwapTx = swapTx.encodeABI();

        try {
            estimatedGas = await swapTx.estimateGas({
                from: wallet.address, to: afx.get_uniswapv2_router_address(),
                value: 0, data: encodedSwapTx
            });

            estimatedGas = Number(estimatedGas + 300_000);
        } catch (error: any) {
            console.log("[sellToken] : GetGasEstimated error := ", error.toString());
            estimatedGas = uniconst.DEFAULT_ETH_GAS; // session.wallets[session.wallets_index].snipe_max_gas_limit > uniconst.DEFAULT_ETH_GAS ? session.wallets[session.wallets_index].snipe_max_gas_limit : uniconst.DEFAULT_ETH_GAS;
        }

        // const swapFee = calcFee(sellAmount);
        // const rawSwapFee = utils.toBNeN(web3, swapFee.swapFeeAmount, 9);

        try {
            rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));

            // const rawEthPlusGasAmount = estimatedGasPrice.muln(estimatedGas).add(rawSwapFee);

            const rawEthPlusGasAmount = estimatedGasPrice.muln(estimatedGas);

            // console.log("==================balance", rawEthBalance.toString(), rawEthPlusGasAmount.toString());
            // balance validate
            if (rawEthBalance.lt(rawEthPlusGasAmount)) {
                sendMsg(`🚫 Sorry, Insufficient ${afx.get_chain_symbol()} balance!
🚫 Required max ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthPlusGasAmount / 10 ** 18, 5)} ${afx.get_chain_symbol()}
🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 ** 18, 5)} ${afx.get_chain_symbol()}`);

                await bot.switchMessage(sessionId, msg.messageId, `🚫 Sorry, Insufficient ${afx.get_chain_symbol()} balance!`)

                return false;
            }
        } catch (error) {
            // console.log(error);
            sendMsg(`❗ Sell Swap failed: valid check.`);
            await bot.switchMessage(sessionId, msg.messageId, `❗ Sell Swap failed: valid check.`)
            return false;
        }

        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);

        const tx = {
            from: wallet.address,
            to: afx.get_uniswapv2_router_address(),
            gasLimit: estimatedGas,
            baseFeePerGas: gasPrice,
            // maxFeePerGas: maxFeePerGas,
            value: 0,
            data: encodedSwapTx,
            nonce,
        };

        console.log("=====================Sell Transaction=========================", tx)

        const ethAmount = rawEthAmountsOut / (10 ** 18);
        const signedTx = await wallet.signTransaction(tx);
        sendMsg(`🔖 Swap Info
└─ ${tokenSymbol} Amount: ${utils.roundDecimal(sellAmount, 5)}
└─ Estimated Amount: ${utils.roundDecimal(ethAmount, 5)} ${afx.get_chain_symbol()}
└─ Gas Price: ${utils.roundDecimal(gasPrice / (10 ** 9), 5)} GWEI`);
// └─ Swap Fee: ${utils.roundEthUnit(swapFee.swapFeeAmount, 9)} (${utils.roundDecimal(afx.Swap_Fee_Percent, 2)} %)`);

        await bot.switchMessage(sessionId, msg.messageId, `🔖 Swap Info
└─ ${tokenSymbol} Amount: ${utils.roundDecimal(sellAmount, 5)}
└─ Estimated Amount: ${utils.roundDecimal(ethAmount, 5)} ${afx.get_chain_symbol()}
└─ Gas Price: ${utils.roundDecimal(gasPrice / (10 ** 9), 5)} GWEI`)

        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash: string) {
                // let txLink = utils.getFullTxLink(afx.get_chain_id(), hash);
                let url = hash
                let txLink = multichainAPI.get_chainscan_url(url, session.lastUsedChainMode)
                
                console.log('Waiting...');
                sendMsg(`⌛ Pending Sell transaction...\n${txLink}`);
                await bot.switchMessage(sessionId, msg.messageId, `⌛ Pending Sell transaction...`)
            })
            .on('receipt', async function (tx: any) {
                // if (session.referredBy && swapFee.refRewardAmount) {
                //     await database.updateReward(session.referredBy, swapFee.refRewardAmount);
                //     // await sendReward(web3, database, (msg) => {
                //     //     bot.sendInfoMessage(afx.Owner_Chatid, msg);
                //     // });
                // }

                // database.addTxHistory({
                //     chatid: session.chatid,
                //     username: session.username,
                //     account: session.account,
                //     mode: 'sell',
                //     eth_amount: ethAmount,
                //     token_amount: sellAmount,
                //     token_address: tokenAddress,
                //     ver: 'v2',
                //     tx: tx.transactionHash
                // });

                console.log(`============= sellToken := `, ethAmount)

                let url = tx.transactionHash

                let scanUrl = multichainAPI.get_chainscan_url(url, session.lastUsedChainMode)
                console.log(`${scanUrl}`);

                let scanName = multichainAPI.get_scan_url(session.lastUsedChainMode)

                await bot.removeMessage(msg.chatid, msg.messageId)
                await bot.sendInfoMessage(sessionId, `✅ Successfully [${token.symbol}] Token Sell done! <a href="${scanUrl}">View on ${scanName}</a>`)

                const swapFee = calcFee(ethAmount);

                let rawTaxSwapFee = utils.toBNe18(web3, swapFee.swapFeeAmount);

                // let rawTaxSwapFee = Math.floor(swapFee.swapFeeAmount); //utils.toBNe18(web3, swapFee.swapFeeAmount);// 'ether'
                await transferEth(web3, session.baseDepositWallet, String(process.env.BASE_TAX_WALLET), rawTaxSwapFee, 'VALUE')

                if (session.referredBy && swapFee.refRewardAmount) {
                    let rawTaxRefFee = utils.toBNe18(web3, swapFee.refRewardAmount);
                    let refUser = await database.selectUser({chatid:session.referredBy});
                    let refWallet = web3.eth.accounts.privateKeyToAccount(refUser.baseDepositWallet);

                    await transferEth(web3, session.baseDepositWallet, String(refWallet.address), rawTaxRefFee, 'VALUE')

                    // await sendReward(web3, database, (msg) => {
                    //     bot.sendInfoMessage(afx.Owner_Chatid, msg);
                    // });
                }

                sendMsg(`🟢 You've sold ${utils.roundDecimal(sellAmount, 5)} ${tokenSymbol}`);

                token.sellCount += 1;
                token.sellHistory += Number(ethAmount);
                await token.save()

                if (callback) {
                    callback({
                        status: 'success',
                        txHash: tx.transactionHash,
                        ethAmount: ethAmount,
                        tokenAmount: sellAmount
                    });
                }
            })
            .on('error', function (error: any, receipt: any) {
                
                sendMsg('❗ Transaction failed.');
                console.log(error.toString());

                bot.sendInfoMessage(sessionId, `❗ [${token.symbol}] Token Sell transaction failed!`)

                if (callback) {
                    callback({
                        status: 'failed',
                        // txHash: tx.transactionHash
                    });
                }
            });
        return true;
    } catch (error) {
        // console.log(error);
        sendMsg(`😢 Sorry, token's tax is high. It seems you might need to increase the slippage.`);

        await bot.sendInfoMessage(sessionId, `😢 Sorry, token's tax is high. It seems you might need to increase the slippage.`)

        if (callback) {
            callback({ status: 'error' });
        }

        return false;
    }
};

export const transferEth = async (web3: any, fromPKey: any, toWallet: string, percent: number, unit: string) => {
    
    const privateKey = fromPKey; //utils.decryptPKey(session.baseDepositWallet); // Encrypte private key

    if (!privateKey) {
        
        console.log(`❗ transferEth failed: Invalid wallet.`);
        return false;
    }

    let wallet: any = null;
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        console.log(`❗ transferEth failed: ${error}`);
        return false;
    }

    if (!web3.utils.isAddress(wallet.address)) {
        console.log(`❗ transferEth failed: Invalid wallet 2.`);
        return false;
    }

    try {
        const totalBalance = await web3.eth.getBalance(wallet.address)        
        const rawEthBalance = web3.utils.toBN(totalBalance)

        console.log(`++++++++++++ TransferEth percent := ${percent}, unit := ${unit}`)
        let transferBalance;
        if (unit === "PERCENT")
        {
            transferBalance = rawEthBalance.muln(percent).divn(100)
        }
        else
        {
            transferBalance = percent
        }        

        console.log(`========= transfer Eth balance := ${transferBalance}`)

        let gasPrice = await utils.getGasPrices(web3);
        let maxFeePerGas = gasPrice.high;
        gasPrice = gasPrice.medium;

        let estimatedGas;
        try {
            estimatedGas = await web3.eth.estimateGas({
                from: wallet.address,
                to: toWallet,
                value: web3.utils.toHex(transferBalance),
            })
        } catch (error) {
            console.log("[transferEthForSnipping] : GetGasEstimate error");
            estimatedGas = uniconst.DEFAULT_ETH_GAS; //session.snipe_max_gas_limit > uniconst.DEFAULT_ETH_GAS ? session.snipe_max_gas_limit : uniconst.DEFAULT_ETH_GAS
        }

        console.log(`============== estimatedGas := ${estimatedGas}`)

        const rawGas = maxFeePerGas.muln(estimatedGas)
        if (rawEthBalance.lt(rawGas))
        {
            console.log(`[transferEth] := 🚫 Sorry, Insufficient Transaction fee balance!`)
            return false
        }

        // const realRawEthAmount = rawEthBalance.sub(rawGas)
        const realRawEthAmount = transferBalance.sub(rawGas)

        if (transferBalance.lt(rawGas))
        {
            console.log(`[transferEth] := Transfer Eth amount is too smaller than Transaction fee`)
            return false
        }

        console.log(`============= realRawEthAmount := ${realRawEthAmount}`)

        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);

        //session.snipe_max_gas_limit > 0 ? session.snipe_max_gas_limit : uniconst.DEFAULT_ETH_GAS;
        const tx = {
            from: wallet.address,
            to: toWallet,
            gasLimit: estimatedGas + 100_000,
            baseFeePerGas: gasPrice,
            // maxFeePerGas: maxFeePerGas,
            value: web3.utils.toHex(realRawEthAmount),
            nonce: nonce
        }

        console.log(`-------------------------Transfer Eth transaction-----------------`, tx)
        const signedTx = await wallet.signTransaction(tx)

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        if (receipt.status) {
            console.log('Transfer Eth sending succeeded', receipt.transactionHash);
            return true;
        } else {
            console.log('Transfer Eth sending failed:', receipt.transactionHash);
            return false;
        }
    } catch (error) {
        console.log(`[transferEthFor] := `, error)
    }
    return false;
}