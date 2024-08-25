export interface TickerData {
    instId: string
    last: number
    open24h: string
    high24h: string
    low24h: string
    bestBid: string
    bestAsk: string
    baseVolume: string
    quoteVolume: string
    ts: number
    labeId: number
    openUtc: string
    chgUTC: string
    bidSz: string
    askSz: string
    openUtc8: string
}

export interface SnapshotResponse {
    action: string
    arg: {
        instType: string
        channel: string
        instId: string
    }
    data: TickerData[]
    ts: number
}

export interface SubscribeResponse {
    event: string
    arg: {
        instType: string
        channel: string
        instId: string
    }
}

export type ApiResponse = string & SubscribeResponse & SnapshotResponse

export interface TradingPair {
    symbol: string
    baseCoin: string
    quoteCoin: string
    minTradeAmount: string
    maxTradeAmount: string
    takerFeeRate: string
    makerFeeRate: string
    pricePrecision: string
    quantityPrecision: string
    quotePrecision: string
    status: string
    minTradeUSDT: string
    buyLimitPriceRatio: string
    sellLimitPriceRatio: string
}

export interface Ticker {
    symbol: string
    high24h: number
    open: number
    low24h: number
    lastPr: number
    quoteVolume: number
    baseVolume: number
    usdtVolume: number
    ask: number,
    bid: number,
    bidPr: number
    askPr: number
    bidSz: number
    askSz: number
    openUtc: number
    ts: number
    changeUtc24h: number
    change24h: number
    [key: string]: any
}

export interface TradingPairsResponse {
    code: string
    msg: string
    requestTime: number
    data: TradingPair[]
}

export interface HistoryCandlesResponse {
    code: string
    msg: string
    requestTime: number
    data: (number[])[]
}

export interface TickerResponse {
    code: string
    msg: string
    requestTime: number
    data: Ticker[]
}