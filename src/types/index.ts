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