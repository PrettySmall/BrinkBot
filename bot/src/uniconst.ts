
export const USDC_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
export const SOL_USDC_POOL_ADDRESS = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
export const OPENBOOK_PROGRAM_ADDRESS = "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
export const WSOL_ADDRESS = "So11111111111111111111111111111111111111112"
export const WSOL_DECIMALS = 9
export const WSOL2022_ADDRESS = "9pan9bMn5HatX4EJdBwg9VgCa7Uz5HL8N1m5D3NdXejP"
export const USDT_ADDRESS = `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

export const JITO_AUTH_KEYS = [
	"iRcuECGN5pLMBa9NyVEikihW6PLu3oJMza9nXih3yCNcyfXzCjKVSvT3x8LkGbXTsiRhXMZByWNGUueb7fLnrYh",
	"5BjpWcqqxoERcSXm5Z1phiU3BEnHzZx671YaxngoUKGVJjCM3ziSsP8H34CDiq4FCM2dedYmSiXUZ1LCb1N8MGuD",
	"4VX7jrdRLosTZu3cRhwjyzvJ1HbfTH67ungTTVmdQdmgm51N6r9DcXjW43ABdkEDWvFQVLSexZrFHjvgWMNZPS69",
	"4bZcCSoZbUmAy7x91HD1Y65VYL3HabGtUpxuTe9ZjW6K3R1jPZy1JCaXR3ktzttzSEFvrPv89pY1NJkCXGSqF44J",
	"Vzkib5wfkcJyPbmg8TsxKWjdvfqEXGwPqxrofiRAMwtmBmKxjPQupnN1RsHTz8MY3TkyQTmApDj4Jbb8eShMTWi",
	"3pa6HtbxRkM1Dgv2sL3V5eqwGy2f4DAACrYvp6N8hp59t3XK9qyxiUsicx5YFHtPxHA1Por9EA7axmBJnrk2zUGy",
	"LFcn5CdunXpqYESU8bVfWZ51CSgQx4KY3mGs6AroE9vZHqBDSyZUJhf2grDksK8kCkcmL3LcPTtXsok9zTsytuR"
]

export const PRIORITY_RATE = 100000

export const JITO_BUNDLE_TIP = 0.00005
export const JITO_FEE_AMOUNT = 1;

export const REFERRAL_FEE_LIMIT = 0.0009

export const MIN_DIVIDE_SOL = 0.1;
export const MIN_TARGET_VOLUME = 0.1;

export const MAX_WALLET_SIZE = 8;

export const VOLUME_UNIT = 1000000;

export const SOL_TAX_FEE_PER_1M_VOLUME = 10;
export const SOL_TAX_FEE_PER_HOUR = 0.05;
export const SOL_TAX_FEE_PER_DAY = 2;
export const SOL_TAX_FEE_PER_TRX = 0.005;
export const SOL_TAX_FEE_RATING = 12;

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const LIMIT_FREE_TOKEN_COUNT = 2;
export const LIMIT_REST_SOL_AMOUNT = 0.01;

export const FETCH_INTERVAL = 500;

export enum SWAP_MODE {
	MANUAL = 0,
	AUTO,
}

export enum ResultCode {
	SUCCESS = 0,
	INTERNAL,
	PARAMETER,
	USER_INSUFFICIENT_SOL,
	USER_INSUFFICIENT_JITO_FEE_SOL,
	USER_INSUFFICIENT_ENOUGH_SOL,
	INVALIDE_USER,
	INVALIDE_TOKEN,
}

export const RAYDIUM_POOL_KEY_URL = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json'

export const BOT_FOOTER_DASH = "_______________________________________________________"
// export const BOT_FOOTER_DASH = ""

export const ETHEREUM_CHAIN_ID = 1
export const BSC_CHAIN_ID = 56
export const SOLANA_CHAIN_ID = 102
export const BASE_CHAIN_ID = 8453
export const TON_CHAIN_ID = 1100
