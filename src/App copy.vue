<script setup lang="ts">
import { ElNotification, TableColumnCtx } from "element-plus"
import TopRank from "./components/TopRank.vue"
import { latest24h, windows, latest } from "./apis/binance-api"
import { wsUrl, wsUrl2 } from "./apis/binance-ws-api"
import { SymbolChange, TickerPrice } from "./types"
import { ref, computed, onMounted, watch } from "vue"
import axios from "axios"
import { paddingZero } from "./utils/number"
import { numberFormat } from "./utils/format"
import { ipcRenderer } from "electron"

const latestUpdateTime = ref<number>(0)
const hour24UpdateTime = ref<number>(0)
const now = ref<number>(0)
const requestInterval = ref<boolean>(false)
const proxySetting = ref<string>("127.0.0.1:10800")
const proxyEnable = ref<boolean>(true)
const proxyStatusOk = ref<boolean>(false)
const buttonShowFlag = ref<boolean>(false)
const proxyCheckServer = "https://www.google.com"
let intervalTimer: NodeJS.Timer
const timerSeconds = ref<number>(30) // 轮询时间间隔，秒
const latestPrice = ref<TickerPrice[]>([])
const change24Hours = ref<SymbolChange[]>([])
const change24HoursTop10 = computed(() => change24Hours.value.slice(0, 20))
const change24HoursTail10 = computed(() => change24Hours.value.slice(change24Hours.value.length - 20).reverse())

const timeFormat = (time: Date) => `${paddingZero(time.getHours())}:${paddingZero(time.getMinutes())}:${paddingZero(time.getSeconds())}`

let latestUpdateTimeFormat = computed(() => {
  return timeFormat(new Date(latestUpdateTime.value))
})

let hour24UpdateTimeFormat = computed(() => {
  return timeFormat(new Date(hour24UpdateTime.value))
})

let nowTime = computed(() => {
  return timeFormat(new Date(now.value))
})

async function getLatest24h() {
  change24Hours.value = await latest24h()
  hour24UpdateTime.value = Date.now()
}

async function getLatest() {
  latestPrice.value = await latest()
  latestUpdateTime.value = Date.now()
}

setInterval(async () => {
  now.value = Date.now()
}, 15)

onMounted(async () => {
  // 初始化代理
  if (proxySetting.value && proxyEnable.value) {
    await setProxy()
  }
  if (proxyStatusOk) {
    // await requestBatch();
  }
})

const wsConnect = (url: string) => {
  let websocket = new WebSocket(url)
  websocket.onopen = function () {
    console.log("连接成功")
  }
  // 接收
  websocket.onmessage = function (e: MessageEvent<any>) {
    // 解析JSON格式的数据
    // const data = JSON.parse(e.data);
    console.log(e.data)
  }
  // 连接发生错误
  websocket.onerror = function () {
    console.log("webSocket连接发生错误")
  }
  websocket.onclose = function (e) {
    console.log("webSocket连接关闭")
  }
}

// 开启代理
async function setProxy() {
  ipcRenderer.send("set-proxy", {
    proxy: proxySetting.value,
    enable: true,
  })
  const status: boolean = await proxyStatusCheck()
  if (status) {
    // wsConnect(wsUrl("btcusdt@miniTicker"));
    wsConnect(wsUrl2(["btcusdt@miniTicker", "ethusdt@miniTicker"]))
  }
}

// 关闭代理
async function closeProxy() {
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
</script>

<template>
  <el-row>
    <div class="top-item">
      <el-text>{{ nowTime }}</el-text>
    </div>
    <div class="top-item">
      <el-checkbox v-model="requestInterval">定时更新</el-checkbox>
      <el-text v-if="requestInterval">&nbsp;&nbsp;定时周期：{{ timerSeconds }}秒</el-text>
    </div>
    <div class="top-item">
      <el-checkbox v-model="proxyEnable">开启代理</el-checkbox> &nbsp;&nbsp;
      <el-input v-if="proxyEnable" v-model="proxySetting"></el-input>
      <el-button v-if="buttonShowFlag && !!proxySetting" @click="applyProxy">&nbsp;&nbsp;测试&应用代理</el-button>
    </div>
  </el-row>
  <!-- 24 小时变化 -->
  <el-row>
    <el-button class="refreshButton" @click="getLatest24h">刷新</el-button>&nbsp;&nbsp;
    <el-text>上次更新：{{ hour24UpdateTimeFormat }}</el-text>
  </el-row>
  <el-row :border="false" :stripe="true">
    <div>
      <TopRank :data="change24HoursTop10" :title="'涨幅榜'" :color="'success'"></TopRank>
    </div>
    <div>
      <TopRank :data="change24HoursTail10" :title="'跌幅榜'" :color="'danger'"></TopRank>
    </div>
  </el-row>
  <!-- 最新价格 -->
  <el-row>
    <el-button class="refreshButton" @click="getLatest">刷新</el-button>&nbsp;&nbsp;
    <el-text>上次更新：{{ latestUpdateTimeFormat }}</el-text>
  </el-row>
  <el-row :border="false" :stripe="true">
    <div>
      <el-text>最新价</el-text>
      <el-table :data="latestPrice">
        <el-table-column prop="symbol" label="名称" width="150" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="120" show-overflow-tooltip :formatter="numberFormat" />
      </el-table>
    </div>
  </el-row>
</template>

<style lang="scss" scoped>
.top-item {
  display: flex;
  margin-right: 20px;
}

.refreshButton {
  margin: 10px 0;
}
</style>
