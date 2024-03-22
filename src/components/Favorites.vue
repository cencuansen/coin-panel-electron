<script setup lang="ts">
import axios from 'axios'
import Sortable from "sortablejs"
import { shell } from "electron"
import { onMounted, ref, watch } from "vue"
import { ipcRenderer } from "electron"
import { bgHttpHost, bgWsHost, bgApis } from "@/bitget/apis"
import { TickerData, SnapshotResponse, SubscribeResponse, ApiResponse, TradingPair, TradingPairsResponse, HistoryCandlesResponse } from "@/bitget/types"

const devtoolsStatus = ref<boolean>(false)
const alwaysOnTop = ref<boolean>(false)
const proxySetting = ref<string>("127.0.0.1:10800")
const proxyEnable = ref<boolean>(true)
const proxyStatusOk = ref<boolean>(false)
const buttonShowFlag = ref<boolean>(false)
const proxyCheckServer = "https://www.google.com"
const allPairs = ref<TradingPair[]>([])
const selectedPair = ref<string>("")
const coinList = ref<string[]>(["BTCUSDT"])
const allPairMap = ref<Map<string, TradingPair>>(new Map<string, TradingPair>())
const coinListMap = ref<Map<string, TickerData | null>>(new Map<string, TickerData>)
const coinOpenMap = ref<Map<string, number>>(new Map<string, number>)

watch(devtoolsStatus, (newVal) => {
    ipcRenderer.send("toggle-devtools", newVal)
})

watch(alwaysOnTop, (newVal) => {
    localStorage.setItem("alwaysOnTop", `${newVal}`)
    ipcRenderer.send("set-always-top", newVal)
})

watch(proxyEnable, async (newVal) => {
    if (newVal && proxySetting.value) {
        await setProxy()
    } else {
        await closeProxy()
    }
})

watch(proxySetting, async (newVal) => {
    buttonShowFlag.value = localStorage.getItem("proxySetting") !== newVal
})

// 开启代理
async function setProxy() {
    ipcRenderer.send("set-proxy", {
        proxy: proxySetting.value,
        enable: true,
    })
    const status: boolean = await proxyStatusCheck()
    if (status) {
        localStorage.setItem("proxyEnable", `true`)
        localStorage.setItem("proxySetting", proxySetting.value)
        await getAllPair()
    }
}

// 关闭代理
async function closeProxy() {
    localStorage.setItem("proxyEnable", `false`)
    ipcRenderer.send("set-proxy", {
        proxy: null,
        enable: false,
    })
    proxyStatusOk.value = false
    buttonShowFlag.value = false
}

async function applyProxy() {
    // 开启或关闭代理
    if (proxyEnable.value && proxySetting.value) {
        await setProxy()
    } else {
        await closeProxy()
    }
}

async function proxyStatusCheck(): Promise<boolean> {
    try {
        await axios.head(proxyCheckServer)
        proxyStatusOk.value = true
        buttonShowFlag.value = false
        return true
    } catch (error) {
        ipcRenderer.send("set-proxy", {
            proxy: null,
            enable: false,
        })
        proxyStatusOk.value = false
        buttonShowFlag.value = true
        return false
    }
}

// 加载缓存
const cache = localStorage.getItem("coinList")
if (cache) {
    coinList.value = JSON.parse(cache).filter(Boolean)
}
// 窗口置顶
const cachedAlwaysOnTop = localStorage.getItem("alwaysOnTop")
if (cachedAlwaysOnTop) {
    alwaysOnTop.value = cachedAlwaysOnTop === "true" ? true : false
}
// 初始化代理
const cachedProxyEnable = localStorage.getItem("proxyEnable")
if (cachedProxyEnable) {
    proxyEnable.value = cachedProxyEnable === "true"
}
const cachedProxySetting = localStorage.getItem("proxySetting")
if (cachedProxySetting) {
    proxySetting.value = cachedProxySetting
}
if (proxySetting.value && proxyEnable.value) {
    setProxy()
}

async function getAllPair() {
    const response = await axios.get(`${bgHttpHost}${bgApis.allPairs}`)
    const pairs: TradingPairsResponse = response.data
    let allPair = pairs.data as TradingPair[]
    allPairs.value = allPair.filter(pair => "USDT" === pair.quoteCoin.toUpperCase())
    allPairs.value.forEach((pair: TradingPair) => {
        allPairMap.value.set(pair.symbol, pair)
    })
}

async function getOpenPrice(symbols: string[]) {
    symbols = symbols.filter(Boolean)
    if (symbols.length === 0) {
        return
    }
    let startTime = new Date()
    startTime.setHours(0, 1, 0, 0) // 设置时间为0点1分
    let timestamp = startTime.getTime() // 获取时间戳
    let index = 0
    let timer = setInterval(async () => {
        // curl "https://api.bitget.com/api/v2/spot/market/history-candles?symbol=BTCUSDT&granularity=1min&endTime=1659080270000&limit=100"
        const response = await axios.get(`${bgHttpHost}${bgApis.historyCandles}?symbol=${symbols[index]}&granularity=1min&endTime=${timestamp}&limit=1`)
        const candles: HistoryCandlesResponse = response.data
        let candleData = candles.data as number[][]
        coinOpenMap.value.set(symbols[index], candleData[0][1])
        // console.log(symbols[index], candleData[0][1])
        index++
        if (index >= symbols.length) {
            clearInterval(timer)
        }
    }, 100)
}

let websocket: WebSocket | null

async function spotSubscrib(tickers: string[]) {
    if (!tickers) { return }
    let sub = {
        "op": "subscribe",
        "args": tickers.map(ticker => {
            return {
                "instType": "SP",
                "channel": "ticker",
                "instId": ticker.toUpperCase()
            }
        })
    }
    websocket?.send(JSON.stringify(sub))
    await getOpenPrice(tickers)
}

function spotUnsubscrib(tickers: string[]) {
    if (!tickers) { return }
    let sub = {
        "op": "unsubscribe",
        "args": tickers.map(ticker => {
            return {
                "instType": "SP",
                "channel": "ticker",
                "instId": ticker.toUpperCase()
            }
        })
    }
    websocket?.send(JSON.stringify(sub))
}

function wsConnect() {
    websocket = new WebSocket(bgWsHost)
    websocket.onopen = function () {
        setInterval(() => {
            websocket?.send("ping")
        }, 30 * 1000)
        spotSubscrib(coinList.value)
    }
    websocket.onmessage = function (e: MessageEvent<any>) {
        if ('pong' === e.data) {
            return
        }
        const message: ApiResponse = JSON.parse(e.data)
        if ("error" === message.event) {
            console.error("response error", message)
            return
        }
        if ("subscribe" === message.event) {
            console.log("subscribe success", message.arg.instId)
            return
        }
        if ("unsubscribe" === message.event) {
            console.log("unsubscribe success", message.arg.instId)
            return
        }
        if (message.data && Array.isArray(message.data) && message.data.length > 0) {
            const data: TickerData = message.data[0]
            coinListMap.value?.set(data.instId, data)
        }
    }
    websocket.onerror = function () {
        console.error("websocket error")
        reconnect()
    }
    websocket.onclose = function (e) {
        console.error("websocket closed")
        reconnect()
    }
}

function reconnect() {
    setTimeout(() => {
        console.error("websocket try reconnect")
        wsConnect()
    }, 1000)
}

wsConnect()

function add() {
    if (!selectedPair.value) {
        return
    }
    if (coinList.value.indexOf(selectedPair.value) > -1) {
        return
    }
    coinList.value.push(selectedPair.value)
    coinListMap.value?.set(selectedPair.value, null)
    selectedPair.value = ""
    localStorage.setItem("coinList", JSON.stringify(coinList.value))
    spotSubscrib(coinList.value)
}

function remove(coin: string) {
    if (!coin) {
        return
    }
    coin = coin.toUpperCase()
    coinList.value = coinList.value.filter(c => c.toUpperCase() !== coin)
    coinListMap.value.delete(coin)
    localStorage.setItem("coinList", JSON.stringify(coinList.value))
    spotUnsubscrib([coin])
}

function setSort() {
    const el = document.querySelector("#dragTable table tbody")
    if (el instanceof HTMLElement) {
        new Sortable(el, {
            sort: true,
            handle: ".handleDrag",
            ghostClass: "sortable-ghost",
            onEnd: (e: any) => {
                const targetRow = coinList.value.splice(e.oldIndex, 1)[0]
                coinList.value.splice(e.newIndex, 0, targetRow)
                localStorage.setItem("coinList", JSON.stringify(coinList.value))
            },
        })
    } else {
        console.error("Element not found or invalid.")
    }
}

function openLink(symbol: string) {
    if (!symbol) {
        return
    }
    shell.openExternal(`https://www.bitget.com/zh-CN/spot/${symbol}?type=spot`)
}

onMounted(async () => {
    // 拖动
    setSort()
})

const windowWith = ref<number>(9999)

function throttle(func: Function, wait: number | undefined) {
    // 节流函数
    let timer: NodeJS.Timeout | null
    return function (this: any) {
        if (!timer) {
            func.apply(this, arguments)
            timer = setTimeout(() => {
                timer = null
            }, wait)
        }
    }
}
function onWindowResize() {
    windowWith.value = window.innerWidth
}
const throttledResize = throttle(onWindowResize, 20)
window.addEventListener("resize", throttledResize)

function colorFunc(row: string) {
    // let item: TickerData | null | undefined = coinListMap.value.get(row)
    // if (!item) {
    //     return ""
    // }
    // let num = Number(item.chgUTC)
    // if (isNaN(num)) {
    //     return ""
    // }
    // return num < 0 ? 'red' : 'green'
    return priceChange(row) < 0 ? 'red' : 'green'
}

function priceFunc(price: number | undefined) {
    if (!price) {
        return ""
    }
    let num = Number(price)
    if (isNaN(num)) {
        return ""
    }
    if (num * 1000 < 1) {
        let fractional = ("" + price).split(".")[1]
        let nonZeroIndex: number = fractional.split("").findIndex(c => Number(c) > 0)
        let nonZeroPart = fractional.substring(nonZeroIndex, Math.min(nonZeroIndex + 3, fractional.length))
        return `0.0{${nonZeroIndex}}${nonZeroPart}`
    }
    return Number(num.toFixed(5))
}

function priceTitleFunc(row: string | undefined) {
    if (!row) {
        return
    }
    let title = ""
    title = windowWith.value < 350 ? `变化：${(Number(coinListMap.value.get(row)?.chgUTC) * 100).toFixed(2)} %` : ""
    title = (windowWith.value < 210 ? `名称：${allPairMap.value.get(row)?.baseCoin}\r\n` : "") + title
    return title
}

function priceChange(symbol: string) {
    return Number(((Number(coinListMap.value.get(symbol)?.last) - (Number(coinOpenMap.value.get(symbol)))) / (Number(coinOpenMap.value.get(symbol))) * 100).toFixed(5))
}

</script>

<template>
    <div class="main-body">
        <div class="top-item" v-if="windowWith >= 700">
            <el-select v-model.trim="selectedPair" placeholder="请选择" size="small" no-data-text="暂无数据" no-match-text="暂无数据"
                style="width: 100px" clearable filterable>
                <el-option v-for="pair in allPairs.filter(p => !coinList.includes(p.symbol))" :key="pair.symbol"
                    :label="pair.symbol" :value="pair.symbol" style="user-select: none;" />
            </el-select>
            &nbsp;&nbsp;
            <el-button @click="add" size="small" :disabled="!selectedPair">添加</el-button>
        </div>
        <el-table id="dragTable" style="font-weight: bold;" :data="coinList" :row-key="item => item" empty-text="暂无数据"
            :show-header="false" fit>
            <el-table-column label="名称" :show-overflow-tooltip="true" v-if="windowWith >= 210">
                <template #default="scope">
                    <span class="basecoin" v-show="allPairMap.get(scope.row)" :title="void (0)" :style="void (0)">
                        <span>{{ allPairMap.get(scope.row)?.baseCoin }}</span>
                        <!-- <span v-if="windowWith > 350">{{ `_${allPairMap.get(scope.row)?.quoteCoin}` }}</span> -->
                    </span>
                </template>
            </el-table-column>
            <el-table-column label="价格" :show-overflow-tooltip="true">
                <template #default="scope">
                    <span :style="{ color: windowWith < 350 ? colorFunc(scope.row) : 'inherit' }"
                        :title="priceTitleFunc(scope.row)">
                        {{ priceFunc(coinListMap.get(scope.row)?.last) }}
                    </span>
                </template>
            </el-table-column>
            <el-table-column label="变化" v-if="windowWith >= 350">
                <template #default="scope">
                    <span v-show="coinListMap.get(scope.row)" :style="{ color: colorFunc(scope.row) }">
                        {{ priceChange(scope.row) }} %
                    </span>
                </template>
            </el-table-column>
            <el-table-column label="操作" v-if="windowWith >= 600" width="160">
                <template #default="scope">
                    <el-button size="small" class="handleDrag" title="移动">
                        <el-icon>
                            <Sort />
                        </el-icon>
                    </el-button>
                    <el-button size="small" @click="openLink(scope.row)" title="浏览器打开">
                        <el-icon>
                            <Link />
                        </el-icon>
                    </el-button>
                    <el-popconfirm title="确定删除？" confirmButtonText="确定" cancelButtonText="取消" @confirm="remove(scope.row)">
                        <template #reference>
                            <el-button size="small" title="删除">
                                <el-icon>
                                    <Delete />
                                </el-icon>
                            </el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<style lang="scss" scoped>
.el-checkbox {
    margin-right: 0;
}

.top-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.refreshButton {
    margin: 10px 0;
}

.el-row {
    margin-bottom: 10px;
}

.list-item {
    margin-bottom: 10px;
}

::v-deep(.el-table__inner-wrapper::before) {
    display: none !important;
}
</style>
