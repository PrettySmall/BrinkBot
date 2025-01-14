import axios, { AxiosHeaders } from 'axios';

import dotenv from 'dotenv';

import * as global from './global'

dotenv.config()

const header: AxiosHeaders = new AxiosHeaders()
header.set('accept', 'application/json')
// header.set('x-chain', 'solana')
header.set('x-api-key', process.env.BIRDEYE_API_KEY)


// const birdeyeApi: any = require("api")("@birdeyedotso/v1.0#crnv83jlti6buqu");
// birdeyeApi.auth(process.env.BIRDEYE_API_KEY);

// export const getTokenDecimal = async (addr: string) => {
// 	try {
// 		const { data }: any = await birdeyeApi.getDefiToken_creation_info({ address: addr, 'x-chain': 'solana' })
// 		return { exist: true, decimal: data.data.decimals };
// 	} catch (error) {
// 		return { exist: false, decimal: 0 }
// 	}
// };

export const getTokenPriceInfo_Birdeye = async (addr: string, chainMode: number) => {
	
	let chainName = global.get_chain_name(chainMode)
	if (chainName === '')	
	{
		console.log(`[getTokenPriceInfo_Birdeye] ===================== token price is failed`)
		return null
	}
	header.set('x-chain', chainName)

	const url: string = `https://public-api.birdeye.so/defi/price?address=${addr}`

	try {
		const { data } = await axios.get(url, {  headers: header })

		if (data.success) {
			return data.data
		}	
	} catch (error) {
		console.log("[getTokenPriceInfo_Birdeye] error = " + error)	
	}	
	return null
}

export const getTokensInfo_InWallet = async (wallet: string) => {

	const url: string = `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${wallet}`
	
	// console.log("[getTokensInfo_InWallet] = ", wallet)

	try {
		const { data } = await axios.get(url, {  headers: header })

		// console.log(data)

		if (data.success) {
			return data.data
		}	
	} catch (error) {
		console.log("[getTokensInfo_InWallet] error = ", error)	
	}	
	return null

}

export const getTokenNewPair_Birdeye = async (chainMode: number) => {
	
	let chainName = global.get_chain_name(chainMode)
	if (chainName === '')	
	{
		console.log(`[getTokenNewPair_Birdeye] ===================== chain is failed`)
		return null
	}
	header.set('x-chain', chainName)

	const url: string = `https://public-api.birdeye.so/defi/v2/tokens/new_listing?limit=10`

	try {
		const { data } = await axios.get(url, {  headers: header })

		// console.log(`========== ${chainName.toUpperCase()} New Pairs := `, data.data)
		if (data.success) {
			return data.data
		}	
	} catch (error) {
		console.log("[getTokenNewPair_Birdeye] error = " + error)	
	}	
	return null
}

export const getTrendingToken_Birdeye = async (chainMode: number) => {
	
	let chainName = global.get_chain_name(chainMode)
	if (chainName === '')	
	{
		console.log(`[getTrendingToken_Birdeye] ===================== chain is failed`)
		return null
	}
	header.set('x-chain', chainName)

	const url: string = `https://public-api.birdeye.so/defi/token_trending?sort_by=volume24hUSD&sort_type=desc&limit=10`

	try {
		const { data } = await axios.get(url, {  headers: header })

		// console.log(`========== ${chainName.toUpperCase()} New Pairs := `, data.data)
		if (data.success) {
			return data.data
		}	
	} catch (error) {
		console.log("[getTrendingToken_Birdeye] error = " + error)	
	}	
	return null
}