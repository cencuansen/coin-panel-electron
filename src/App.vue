<script setup lang="ts">
import axios from 'axios'
import Sortable from "sortablejs"
import { shell } from "electron"
import { onMounted, ref, watch } from "vue"
import { ipcRenderer } from "electron"
import { bgHttpHost, bgWsHost, bgApis } from "./bitget/apis"
import { TickerData, SnapshotResponse, SubscribeResponse, ApiResponse, TradingPair, TradingPairsResponse } from "./bitget/types"

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
  allPairs.value = pairs.data as TradingPair[]
  allPairs.value.forEach((pair: TradingPair) => {
    allPairMap.value.set(pair.symbol, pair)
  })
}

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

let websocket: WebSocket | null = new WebSocket(bgWsHost)
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
}
websocket.onclose = function (e) {
  console.error("websocket closed")
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
});

</script>

<template>
  <div style="width: 700px; user-select: none;">
    <div class="top-item">
      <el-checkbox v-model="alwaysOnTop">窗口置顶</el-checkbox>
      &nbsp;&nbsp;
      <el-checkbox v-model="proxyEnable">开启代理</el-checkbox>
      <span v-if="proxyEnable">&nbsp;&nbsp;</span>
      <el-input v-if="proxyEnable" v-model="proxySetting" size="small" style="width: 120px;height: 24px;"></el-input>
      <span v-if="buttonShowFlag && !!proxySetting">&nbsp;&nbsp;</span>
      <el-button v-if="buttonShowFlag && !!proxySetting" @click="applyProxy" style="height: 24px;">应用</el-button>
      &nbsp;&nbsp;
      <el-select v-model.trim="selectedPair" placeholder="请选择" size="small" no-data-text="暂无数据" no-match-text="暂无数据"
        style="width: 120px" clearable filterable>
        <el-option v-for="pair in allPairs.filter(p => !coinList.includes(p.symbol))" :key="pair.symbol"
          :label="pair.symbol" :value="pair.symbol" style="user-select: none;" />
      </el-select>
      &nbsp;&nbsp;
      <el-button @click="add" size="small" :disabled="!selectedPair">添加</el-button>
      &nbsp;&nbsp;
      <el-text style="color: gray;">数据来自 bitget</el-text>
    </div>
    <el-table id="dragTable" :data="coinList" :row-key="item => item" empty-text="暂无数据" height="calc(100vh - 65px)" fit>
      <el-table-column label="名称">
        <template #default="scope">
          <span class="basecoin" v-show="allPairMap.get(scope.row)">{{
            `${allPairMap.get(scope.row)?.baseCoin}_${allPairMap.get(scope.row)?.quoteCoin}`
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="价格">
        <template #default="scope">
          {{ coinListMap.get(scope.row)?.last }}
        </template>
      </el-table-column>
      <el-table-column label="变化">
        <template #default="scope">
          <span v-show="!isNaN(Number(coinListMap.get(scope.row)?.chgUTC))"
            :style="{ color: Number(coinListMap.get(scope.row)?.chgUTC) < 0 ? 'red' : 'green' }">
            {{ (Number(coinListMap.get(scope.row)?.chgUTC) * 100).toFixed(2) }} %
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作">
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
