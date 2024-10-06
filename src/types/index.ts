export interface SymbolChange {
    symbol: string,
    lastPrice: number,
    priceChangePercent: number,
    m5ChangePercent?: number,
    m10ChangePercent?: number,
}

export interface TickerPrice {
    symbol: string,
    price: number,
}

export interface Exchange {
    name: string
    url: string,
    parser: (data: any) => PriceData[]
}

export interface PriceData {
    key?: string
    exchange?: string
    symbol?: string
    price?: number
}