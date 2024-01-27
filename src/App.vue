<script setup lang="ts">
import { ElNotification } from "element-plus"
import { onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { ipcRenderer } from "electron"
import { bgHttpHost, bgApis } from "./apis/bitget/apis"
import Sortable from "sortablejs"

interface TickerData {
  instId: string
  last: string
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
}

interface SnapshotResponse {
  action: string
  arg: {
    instType: string
    channel: string
    instId: string
  }
  data: TickerData[]
  ts: number
}

interface SubscribeResponse {
  event: string
  arg: {
    instType: string
    channel: string
    instId: string
  }
}

type ApiResponse = string & SubscribeResponse & SnapshotResponse

interface TradingPair {
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

interface TradingPairsResponse {
  code: string
  msg: string
  requestTime: number
  data: TradingPair[]
}

const alwaysOnTop = ref<boolean>(false)
const proxySetting = ref<string>("127.0.0.1:10800")
const proxyEnable = ref<boolean>(true)
const proxyStatusOk = ref<boolean>(false)
const buttonShowFlag = ref<boolean>(false)
const proxyCheckServer = "https://www.google.com"

watch(alwaysOnTop, (newVal) => {
  localStorage.setItem("alwaysOnTop", `${newVal}`)
  ipcRenderer.send("set-always-top", newVal)
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
    wsConnect("wss://ws.bitgetapi.com/spot/v1/stream")
    const allPairResponse: TradingPairsResponse = (await axios.get(`${bgHttpHost}${bgApis.allPairs}`)).data
    allPairs.value = allPairResponse.data as TradingPair[]
    allPairs.value.forEach((pair: TradingPair) => {
      allPairMap.value.set(pair.symbol, pair)
    })
  }
}

// 关闭代理
async function closeProxy() {
  localStorage.setItem("proxyEnable", `false`)
  ipcRenderer.send("set-proxy", {
    proxy: null,
    enable: false,
  })
  if (proxyStatusOk.value) {
    ElNotification({
      title: "代理已关闭！",
      type: "success"
    })
  }
  proxyStatusOk.value = false
  buttonShowFlag.value = false
}

watch(proxyEnable, async (newVal) => {
  if (newVal && proxySetting.value) {
    await setProxy()
  } else {
    await closeProxy()
  }
})

watch(proxySetting, async (newVal) => {
  buttonShowFlag.value = !!newVal
})

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
    ElNotification({
      title: "代理已开启！",
      type: "success"
    })
    proxyStatusOk.value = true
    buttonShowFlag.value = false
    return true
  } catch (error) {
    ElNotification({
      title: "代理配置有误，请检查！",
      type: "error"
    })
    ipcRenderer.send("set-proxy", {
      proxy: null,
      enable: false,
    })
    if (proxyStatusOk.value) {
      proxyStatusOk.value = false
    }
    buttonShowFlag.value = true
    return false
  }
}

const allPairs = ref<TradingPair[]>([])
const allPairMap = ref<Map<string, TradingPair>>(new Map<string, TradingPair>())
const selectedPair = ref<string>("")
const coinList = ref<string[]>(["BTCUSDT", "ETHUSDT"])
const coinListMap = ref<Map<string, TickerData | null>>(new Map<string, TickerData>)

let websocket: WebSocket | null = null

function spotSubscrib(tickers: string[]) {
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

const wsConnect = (url: string) => {
  websocket = new WebSocket(url)
  websocket.onopen = function () {
    console.log("连接成功")
    setInterval(() => {
      // 心跳
      websocket?.send("ping")
    }, 20 * 1000)
    // 加载缓存
    const cache = localStorage.getItem("coinList")
    if (cache) {
      coinList.value = JSON.parse(cache).filter(Boolean)
    }
    spotSubscrib(coinList.value)
  }
  // 接收
  websocket.onmessage = function (e: MessageEvent<any>) {
    // console.log(e.data)
    if ('pong' === e.data) {
      console.log("pong")
      return
    }
    const message: ApiResponse = JSON.parse(e.data)
    if ("error" === message.event) {
      console.log("请求失败", message)
      return
    }
    if (message.data) {
      const data: TickerData = message.data[0]
      // console.log(`${data.instId} ${data.last} ${data.chgUTC * 100}%`)
      coinListMap.value?.set(data.instId, data)
    }
  }
  // 连接发生错误
  websocket.onerror = function () {
    console.log("webSocket连接发生错误")
  }
  websocket.onclose = function (e) {
    console.log("webSocket连接关闭")
  }
}

function updateCache() {
  localStorage.removeItem("coinList")
  localStorage.setItem("coinList", JSON.stringify(coinList.value))
}

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
  updateCache()
  spotSubscrib(coinList.value)
}

function remove(coin: string) {
  if (!coin) {
    return
  }
  coin = coin.toUpperCase()
  coinList.value = coinList.value.filter(c => c.toUpperCase() !== coin)
  coinListMap.value.delete(coin)
  updateCache()
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
        updateCache()
      },
    })
  } else {
    console.error("Element not found or invalid.")
  }
}

onMounted(async () => {
  const cachedAlwaysOnTop = localStorage.getItem("alwaysOnTop")
  if (cachedAlwaysOnTop) {
    alwaysOnTop.value = cachedAlwaysOnTop === "true" ? true : false
  }
  // 初始化代理
  const cachedProxyEnable = localStorage.getItem("proxyEnable")
  if (cachedProxyEnable) {
    proxyEnable.value = cachedProxyEnable === "true" ? true : false
  }
  const cachedProxySetting = localStorage.getItem("proxySetting")
  if (cachedProxySetting) {
    proxySetting.value = cachedProxySetting
  }
  if (proxySetting.value && proxyEnable.value) {
    await setProxy()
  }
  if (proxyStatusOk) {
    // await requestBatch();
  }
  // 拖动
  setSort()
});

</script>

<template>
  <div style="width: 700px; user-select: none;">
    <el-row>
      <div class="top-item">
        <el-checkbox v-model="alwaysOnTop">窗口置顶</el-checkbox>
        &nbsp;&nbsp;
        <el-checkbox v-model="proxyEnable">开启代理</el-checkbox>
        <span v-if="proxyEnable">&nbsp;&nbsp;</span>
        <el-input v-if="proxyEnable" v-model="proxySetting" size="small"></el-input>
        <span v-if="buttonShowFlag && !!proxySetting">&nbsp;&nbsp;</span>
        <el-button v-if="buttonShowFlag && !!proxySetting" @click="applyProxy">测试&应用代理</el-button>
      </div>
    </el-row>
    <el-row class="search">
      <el-select v-model.trim="selectedPair" placeholder="请选择" size="small" style="width: 240px" clearable filterable>
        <el-option v-for="pair in allPairs" :key="pair.symbol" :label="pair.symbol" :value="pair.symbol"
          :disabled="coinList.includes(pair.symbol)" />
      </el-select>
      &nbsp;&nbsp;
      <el-button @click="add" size="small" :disabled="!selectedPair">添加</el-button>
      &nbsp;&nbsp;
      <el-text style="color: gray;user-select: none;">注：bitget 数据</el-text>
    </el-row>
    <el-table v-if="allPairMap.size > 0" id="dragTable" :data="coinList" :row-key="item => item" :border="true" style="">
      <el-table-column label="名称" width="180">
        <template #default="scope">
          <span class="basecoin">{{
            `${allPairMap.get(scope.row)?.baseCoin}_${allPairMap.get(scope.row)?.quoteCoin}`
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="价格">
        <template #default="scope">
          {{ coinListMap.get(scope.row)?.last }}
        </template>
      </el-table-column>
      <el-table-column label="变化" width="100">
        <template #default="scope">
          <span :style="{ color: Number(coinListMap.get(scope.row)?.chgUTC) < 0 ? 'red' : 'green' }">
            {{ (Number(coinListMap.get(scope.row)?.chgUTC) * 100).toFixed(2) }} %
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="scope">
          <el-button size="small" class="handleDrag">
            <el-icon>
              <Sort />
            </el-icon></el-button>
          <el-popconfirm title="确定删除？" confirmButtonText="确定" cancelButtonText="取消" @confirm="remove(scope.row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
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
</style>
