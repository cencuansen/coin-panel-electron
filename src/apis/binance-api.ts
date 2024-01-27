import axios from "axios";
import {SymbolChange, TickerPrice} from "../types"
import _ from "lodash";

const PROXY: string = "";

const API_HOSTS: string[] = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api4.binance.com",
];

const API_PATHS: Record<string, string> = {
    ping: "/api/v3/ping",
    time: "/api/v3/time",
    exchange_info: "/api/v3/exchangeInfo",
    latest_price: "/api/v3/ticker",
    latest24h: "/api/v3/ticker/24hr",
    latest: "/api/v3/ticker/price",
    ticker: "/api/v3/ticker",
};

const apiUrl = (key: string): string => `${API_HOSTS[4]}${API_PATHS[key]}`;

// 24小时数据
export async function latest24h(): Promise<SymbolChange[]> {
    const hr24 = apiUrl("latest24h");
    const response = await axios.get(hr24);
    const all: SymbolChange[] = response.data;
    return all
        .filter((a) => a.symbol.endsWith("USDT"))
        .filter(a => !(a.symbol.endsWith("DOWNUSDT") || a.symbol.endsWith("UPUSDT")))
        .map((a) => {
            return {
                symbol: a.symbol,
                lastPrice: a.lastPrice,
                priceChangePercent: a.priceChangePercent,
            };
        }).sort((a, b) => b.priceChangePercent - a.priceChangePercent);
}

// 获取最新价格
export async function latest(symbols: string[] = []): Promise<TickerPrice[]> {
    const params: {} = _.isEmpty(symbols) ? {} : {symbols: JSON.stringify(symbols)}
    const response = await axios.get(apiUrl("latest"), {params});
    return response.data;
}

// 获取移动窗口价格
export async function windows({symbols = ["BTCUSDT"], windowSize = "5m"}): Promise<SymbolChange[]> {
    if (_.isEmpty(symbols)) {
        return [];
    }
    const api = apiUrl("ticker");
    const symbolQueryString = `%5B${symbols.map((p) => `%22${p}%22`).join(",")}%5D`;
    const url = `${api}?symbols=${symbolQueryString}&windowSize=${windowSize}`;
    const response = await axios.get(url);
    const all: SymbolChange[] = response.data;
    return all.map((a) => {
        return {
            symbol: a.symbol,
            lastPrice: a.lastPrice,
            priceChangePercent: a.priceChangePercent,
        };
    }).sort((a, b) => b.priceChangePercent - a.priceChangePercent);
}
