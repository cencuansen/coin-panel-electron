const WS_HOSTS: string[] = [
    "wss://stream.binance.com:9443/ws/",
    "wss://stream.binance.com:9443/stream?streams="
];

export const wsUrl = (key: string): string => `${WS_HOSTS[0]}${key}`;
export const wsUrl2 = (keys: string[]): string => `${WS_HOSTS[1]}${keys.join("/")}`;



