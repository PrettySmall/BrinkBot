import dotenv from 'dotenv';

import { Connection } from '@solana/web3.js';
import Web3 from 'web3'

import * as server from '../server';
import * as bot from './bot';
import * as afx from './global';
import * as utils_base from './base/utils_base'

import * as autoTrader from './auto_trader'

dotenv.config()

// const conn: Connection = new Connection(clusterApiUrl(afx.getCluserApiType() as any), "confirmed");
// const conn: Connection = new Connection(process.env.SOLANA_MAINNET_RPC as string, "confirmed");
// const conn: Connection = new Connection(process.env.QUICKNODE_URL as string, "finalized");

// afx.setWeb3(conn)

// const options = {
// 	reconnect: {
// 		auto: true,
// 		delay: 5000, // ms
// 		maxAttempts: 5,
// 		onTimeout: false
// 	}
// };

// export const web3: any = new Web3(new Web3.providers.WebsocketProvider(String(process.env.BASE_RPC_URL), options))
// export const web3Http: any = new Web3(String(process.env.BASE_RPC_HTTP_URL))

// utils_base.init(web3, web3Http)

bot.init(async (session: any, command: string, params: any, messageId: number) => {

	try {

		if (command === parseInt(command).toString()) {

			// const trackNum = parseInt(command)
			// const item: any = await database.selectPanelByRowNumber(session.chatid, trackNum)

			// console.log(item)
			// if (item) {
			//     bot.trackPanel(session.chatid, item.id, 0)
			// }

		}

	} catch (error) {

	}


}, async (option: number, param: any) => {

	// if (option === OptionCode.MSG_GETTOKENINFO) {
	//     const session = param.session
	//     const address = param.address
	// }
})

afx.init()
server.start(bot);

// Daemon thread
// depoDetector.start()
// autoTrader.start()