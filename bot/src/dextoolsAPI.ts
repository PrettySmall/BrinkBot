import axios, { AxiosHeaders } from 'axios';
import * as global from './global'

const header: AxiosHeaders = new AxiosHeaders()
header.set('accept', 'application/json')
header.set('x-api-key', global.get_dextool_api_key())

// {
// 	"statusCode": 200,
// 	"data": {
// 	  "price": 0.0000764274534670699,
// 	  "priceChain": 5.65541863694825e-7,
// 	  "price5m": 0.000009778497307501195,
// 	  "priceChain5m": 7.19641256713212e-8,
// 	  "variation5m": 681.5868948334378,
// 	  "variationChain5m": 685.8663721946698,
// 	  "variation1h": null,
// 	  "variationChain1h": null,
// 	  "variation6h": null,
// 	  "variationChain6h": null,
// 	  "variation24h": null,
// 	  "variationChain24h": null
// 	}
//   }

export const getTokenPriceInfo = async (addr: string) => {
	const url: string = `https://public-api.dextools.io/trial/v2/token/solana/${addr}/price`

	try {
		const { data } = await axios.get(url, { headers: header })
		if (data.statusCode == 200) {
			return data.data
		}	
	} catch (error) {
		console.log("getTokenPriceInfo error = " + error)	
	}	
	return null
}

//
// {
// 	"statusCode": 200,
// 	"data": {
// 	  "address": "Bqecm3dtVaZzrkTZsD7AiyP88Ga1WD1JudwVEtu8fyTm",
// 	  "name": "ojey sumpson ",
// 	  "symbol": "ojeys",
// 	  "logo": "https://www.dextools.io/resources/tokens/logos/",
// 	  "description": "",
// 	  "decimals": 6,
// 	  "socialInfo": {
// 		"bitbucket": "",
// 		"discord": "",
// 		"facebook": "",
// 		"github": "",
// 		"instagram": "",
// 		"linkedin": "",
// 		"medium": "",
// 		"reddit": "",
// 		"telegram": "",
// 		"tiktok": "",
// 		"twitter": "",
// 		"website": "",
// 		"youtube": ""
// 	  }
// 	}
//   }
//
export const getTokenBaseInfo = async (addr: string) => {
	const url: string = `https://public-api.dextools.io/trial/v2/token/solana/${addr}`
	const { data } = await axios.get(url, { headers: header })
	if (data.statusCode == 200) {
		return data.data
	}
	return null
}

// {
// 	"statusCode": 200,
// 	"data": {
// 	  "isOpenSource": "yes",
// 	  "isHoneypot": "no",
// 	  "isMintable": "no",
// 	  "isProxy": "unknown",
// 	  "slippageModifiable": "no",
// 	  "isBlacklisted": "unknown",
// 	  "sellTax": {
// 		"min": null,
// 		"max": null,
// 		"status": "unknown"
// 	  },
// 	  "buyTax": {
// 		"min": null,
// 		"max": null,
// 		"status": "unknown"
// 	  },
// 	  "isContractRenounced": "yes",
// 	  "isPotentiallyScam": "no",
// 	  "updatedAt": "2024-04-11T16:45:48.480Z"
// 	}
//   }

export const getTokenAudit = async (addr: string) => {
	const url: string = `https://public-api.dextools.io/trial/v2/token/solana/${addr}/audit`
	const { data } = await axios.get(url, { headers: header })
	if (data.statusCode == 200) {
		return data.data
	}
	return null
}

// {
// 	"statusCode": 200,
// 	"data": {
// 	  "circulatingSupply": 999978038.4732928,
// 	  "totalSupply": 999978038.4732928,
// 	  "mcap": 54405484.55681635,
// 	  "fdv": 54405484.55681635,
// 	  "holders": 22326,
// 	  "transactions": 0
// 	}
//   }

export const getTokenInfo = async (addr: string) => {
	const url: string = `https://public-api.dextools.io/trial/v2/token/solana/${addr}/info`
	const { data } = await axios.get(url, { headers: header })
	if (data.statusCode == 200) {
		return data.data
	}
	return null
}

// {
// 	"amountLocked": 0,
// 	"nextUnlock": {
// 	  "provider": "string",
// 	  "amount": 0,
// 	  "lockDate": "1970-01-01T00:00:00.000Z",
// 	  "unlockDate": "1970-01-01T00:00:00.000Z"
// 	},
// 	"locks": [
// 	  {
// 		"provider": "string",
// 		"amount": 0,
// 		"lockDate": "1970-01-01T00:00:00.000Z",
// 		"unlockDate": "1970-01-01T00:00:00.000Z"
// 	  }
// 	]
//   }

export const getTokenLockInfo = async (addr: string) => {
	const url: string = `https://public-api.dextools.io/trial/v2/token/solana/${addr}/locks`
	const { data } = await axios.get(url, { headers: header })
	if (data.statusCode == 200) {
		return data.data
	}
	return null
}

// {
// 	"statusCode": 200,
// 	"data": {
// 	  "reserves": {
// 		"mainToken": 201021120.8153859,
// 		"sideToken": 45.182481473
// 	  },
// 	  "liquidity": 12339.06102579059
// 	}
//   }


export const getPoolLiquidityInfo = async (poolAddr: string) => {
	const url: string = `https://public-api.dextools.io/trial/v2/pool/solana/${poolAddr}/liquidity`
	const { data } = await axios.get(url, { headers: header })
	if (data.statusCode == 200) {
		return data.data
	}
	return null
}

// {
// 	"statusCode": 200,
// 	"data": {
// 	  "page": 0,
// 	  "pageSize": 20,
// 	  "totalPages": 1,
// 	  "results": [
// 		{
// 		  "creationBlock": 256830191,
// 		  "creationTime": "2024-03-27T21:16:44.000Z",
// 		  "exchange": {
// 			"name": "Raydium",
// 			"factory": "675kpx9mhtjs2zt1qfr1nyhuzelxfqm9h24wfsut1mp8"
// 		  },
// 		  "address": "BHX7LbB8yggamQ78LGUdhjBz6vyP4Qq9bp5ssQPAzzoV",
// 		  "mainToken": {
// 			"name": "Diddy on Sol",
// 			"symbol": "PDIDDY",
// 			"address": "5zYABcnzzVyU6CNnkeTpjzieQSDms6PffS3yNwMZMoAB"
// 		  },
// 		  "sideToken": {
// 			"name": "Wrapped SOL",
// 			"symbol": "SOL",
// 			"address": "So11111111111111111111111111111111111111112"
// 		  }
// 		}
// 	  ]
// 	}
//   }