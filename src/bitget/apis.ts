import axios1 from 'axios'
import { shell } from "electron"
import { TickerData, SnapshotResponse, SubscribeResponse, ApiResponse, TradingPair, Ticker, TradingPairsResponse, HistoryCandlesResponse, TickerResponse } from "./types"

export const bgHttpHost = "https://api.bitget.com"
export const bgWsHost = "wss://ws.bitgetapi.com/spot/v1/stream"

const bgHost = "https://www.bitget.com"

const axios = axios1.create({
    baseURL: bgHttpHost
})

export const bgApis = {
    allPairs: "/api/v2/spot/public/symbols",
    historyCandles: "/api/v2/spot/market/history-candles",
    tickers: "/api/v2/spot/market/tickers"
}

export function openLink(symbol: string) {
    if (!symbol) {
        return
    }
    shell.openExternal(`${bgHost}/zh-CN/spot/${symbol}`)
}

export async function allPairsFun(): Promise<TradingPair[]> {
    const response = await axios.get(bgApis.allPairs)
    const pairs: TradingPairsResponse = response.data
    return pairs.data
}

export async function openPriceFun(symbols: string[], callback: Function) {
    symbols = symbols.filter(Boolean)
    if (!symbols.length) return
    const startTime = new Date()
    startTime.setHours(0, 1, 0, 0)
    const timestamp = startTime.getTime()

    for (let i = 0; i < symbols.length; i++) {
        (index => {
            setTimeout(async function () {
                const response = await axios.get(bgApis.historyCandles, {
                    params: { symbol: symbols[index], granularity: '1min', endTime: timestamp, limit: 1 }
                })
                const candles: HistoryCandlesResponse = response.data
                let candleData = candles.data as number[][]
                callback(symbols[index], candleData[0][1])
            }, 250 * index)
        })(i)
    }
}

export async function allTickersFun(): Promise<Ticker[]> {
    const response = await axios.get(bgApis.tickers)
    const result: TickerResponse = response.data
    const tickers: Ticker[] = result.data
    for (let i = 0; i < tickers.length; i++) {
        tickers[i].ask = tickers[i].askPr * tickers[i].askSz
        tickers[i].bid = tickers[i].bidPr * tickers[i].bidSz
        tickers[i].change24h = tickers[i].change24h * 100
        tickers[i].changeUtc24h = tickers[i].changeUtc24h * 100
    }
    return tickers
}