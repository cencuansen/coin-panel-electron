import axios from "axios";

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
    hr24: "/api/v3/ticker/24hr",
    price: "/api/v3/ticker/price",
    ticker: "/api/v3/ticker",
};

const getApiFullUrl = (key: string): string => `${API_HOSTS[4]}${API_PATHS[key]}`;

!(async () => {
    const ping = getApiFullUrl("ping");
    const time = getApiFullUrl("time");
    const exchange_info = getApiFullUrl("exchange_info");
    const latest_price = getApiFullUrl("latest_price");


    // const response = await getHr24();
    // const response = await getWindowPrice();
    // const response = await getPrice();

    // console.log(response);
})();

export interface SymbolChange {
    symbol: string,
    lastPrice: number,
    priceChangePercent: number,
    m5ChangePercent?: number,
    m10ChangePercent?: number,
}

// 24小时数据
export async function get24HoursPrice(): Promise<SymbolChange[]> {
    const hr24 = getApiFullUrl("hr24");
    const response = await axios.get(hr24);
    const all: SymbolChange[] = response.data;
    const lite: SymbolChange[] = all
        .filter((a) => a.symbol.endsWith("USDT"))
        .filter(a => !(a.symbol.endsWith("DOWNUSDT") || a.symbol.endsWith("UPUSDT")))
        .map((a) => {
            return {
                symbol: a.symbol,
                lastPrice: a.lastPrice,
                priceChangePercent: a.priceChangePercent,
            };
        });
    lite.sort((a, b) => b.priceChangePercent - a.priceChangePercent);

    return lite;
}

// 获取最新价格
export async function getPrice(symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "OGUSDT"]) {
    const api = getApiFullUrl("price");
    const symbolString = `%5B${symbols.map((p) => `%22${p}%22`).join(",")}%5D`;
    const url = `${api}?symbols=${symbolString}`;
    const response = await axios.get(url);
    return response.data;
}

// 获取移动窗口价格
export async function getWindowPrice({ symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "OGUSDT"], windowSize = "5m" }): Promise<SymbolChange[]> {
    const api = getApiFullUrl("ticker");
    const symbolQueryString = `%5B${symbols.map((p) => `%22${p}%22`).join(",")}%5D`;
    const url = `${api}?symbols=${symbolQueryString}&windowSize=${windowSize}`;
    const response = await axios.get(url);
    const all: SymbolChange[] = response.data;
    const lite: SymbolChange[] = all.map((a) => {
        return {
            symbol: a.symbol,
            lastPrice: a.lastPrice,
            priceChangePercent: a.priceChangePercent,
        };
    });
    lite.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
    return lite;
}
