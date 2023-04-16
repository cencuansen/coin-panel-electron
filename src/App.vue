<script setup lang="ts">
import { ElNotification, TableColumnCtx } from "element-plus";
import { get24HoursPrice, SymbolChange, getWindowPrice } from "./apis/binance-api";
import { ref, computed, onMounted, watch } from "vue";
import axios from "axios";
import { ipcRenderer } from "electron";

const hour24UpdateTime = ref<number>(0);
const windowUpdateTime = ref<number>(0);
const now = ref<number>(0);
const requestByInverval = ref<boolean>(false);
const proxySetting = ref<string>("127.0.0.1:10800");
const proxyEnable = ref<boolean>(true);
const proxyStatusOk = ref<boolean>(false);
const buttonShowFlag = ref<boolean>(false);
const proxyCheckServer = "https://www.google.com";
let intervalTimer: NodeJS.Timer;
const timerSeconds = ref<number>(30); // 轮询时间间隔，秒
const windowPrice5m = ref<SymbolChange[]>([]);
const windowPrice30m = ref<SymbolChange[]>([]);
const windowPrice60m = ref<SymbolChange[]>([]);
const allSymbols = ref<string[]>([]);
const change24Hours = ref<SymbolChange[]>([]);
const change24HoursTop10 = computed(() => change24Hours.value.slice(0, 10));
const change24HoursTail10 = computed(() => change24Hours.value.slice(change24Hours.value.length - 10).sort((a, b) => a.priceChangePercent - b.priceChangePercent));

let hour24UpdateTimeFormated = computed(() => {
  const time = new Date(hour24UpdateTime.value);
  return `${paddingZero(time.getHours())}:${paddingZero(time.getMinutes())}:${paddingZero(time.getSeconds())}`
});

let windowUpdateTimeFormated = computed(() => {
  const time = new Date(windowUpdateTime.value);
  return `${paddingZero(time.getHours())}:${paddingZero(time.getMinutes())}:${paddingZero(time.getSeconds())}`
});

let nowTime = computed(() => {
  const time = new Date(now.value);
  return `${paddingZero(time.getHours())}:${paddingZero(time.getMinutes())}:${paddingZero(time.getSeconds())}`
});

function paddingZero(num: number) {
  if (num < 10) {
    return `0${num}`
  } else {
    return `${num}`;
  }
}

async function hour24() {
  const h24 = await get24HoursPrice();
  // allSymbols.value = h24.map(h => h.symbol);
  const symbolsTop10 = h24.map(h => h.symbol).slice(0, 10);
  const symbolsTail10 = h24.map(h => h.symbol).slice(h24.length - 10);
  const symbols: string[] = [];
  symbols.push(...symbolsTop10);
  symbols.push(...symbolsTail10);
  const m5 = await getWindowPrice({ symbols, windowSize: "5m" });
  const m10 = await getWindowPrice({ symbols, windowSize: "10m" });
  h24.forEach(h => h.m5ChangePercent = m5.find(x => x.symbol === h.symbol)?.priceChangePercent ?? 0);
  h24.forEach(h => h.m10ChangePercent = m10.find(x => x.symbol === h.symbol)?.priceChangePercent ?? 0);
  change24Hours.value = h24;

  hour24UpdateTime.value = Date.now();
}

function symbolFormat(row: any, column: TableColumnCtx<any>, cellValue: any, index: number): string {
  return (cellValue as string).replace("UPUSDT", "").replace("DOWNUSDT", "").replace("USDT", "");
}

function priceFormat(row: any, column: TableColumnCtx<any>, cellValue: any, index: number): string {
  return (Number(cellValue)).toFixed(2);
}

async function window() {
  windowPrice5m.value = await getWindowPrice({ windowSize: "5m" });
  windowPrice30m.value = await getWindowPrice({ windowSize: "30m" });
  windowPrice60m.value = await getWindowPrice({ windowSize: "1h" });

  windowUpdateTime.value = Date.now();
}

setInterval(async () => {
  now.value = Date.now();
}, 15);

async function requestBatch() {
  await hour24();
  await window();
}

onMounted(async () => {
  // 初始化代理
  if (proxySetting.value && proxyEnable.value) {
    await openProxy();
  }
  if (proxyStatusOk) {
    // await requestBatch();
  }
});

watch(requestByInverval, (newVal) => {
  if (newVal) {
    intervalTimer = setInterval(requestBatch, timerSeconds.value * 1000);
  } else {
    clearInterval(intervalTimer);
  }
});

// 开启代理
async function openProxy() {
  ipcRenderer.send("set-proxy", {
    proxy: proxySetting.value,
    enable: true,
  });
  await proxyStatusCheck();
}

// 关闭代理
async function closeProxy() {
  ipcRenderer.send("set-proxy", {
    proxy: null,
    enable: false,
  });
  if (proxyStatusOk.value) {
    ElNotification({
      title: "代理已关闭！",
      type: "success"
    });
  }
  proxyStatusOk.value = false;
  buttonShowFlag.value = false;
}

watch(proxyEnable, async (newVal) => {
  if (newVal && proxySetting.value) {
    await openProxy();
  } else {
    await closeProxy();
  }
});

watch(proxySetting, async (newVal) => {
  buttonShowFlag.value = !!newVal;
});

async function applyProxy() {
  // 开启或关闭代理
  if (proxyEnable.value && proxySetting.value) {
    await openProxy();
  } else {
    await closeProxy();
  }
}

async function proxyStatusCheck(): Promise<boolean> {
  try {
    await axios.head(proxyCheckServer);
    ElNotification({
      title: "代理已开启！",
      type: "success"
    });
    proxyStatusOk.value = true;
    buttonShowFlag.value = false;
    return true;
  } catch (error) {
    ElNotification({
      title: "代理配置有误，请检查！",
      type: "error"
    });
    ipcRenderer.send("set-proxy", {
      proxy: null,
      enable: false,
    });
    if (proxyStatusOk.value) {
      proxyStatusOk.value = false;
    }
    buttonShowFlag.value = true;
    return false;
  }
}
</script>


<template>
  <el-row>
    <el-text>当前时间：{{ nowTime }}</el-text>
    <el-text>&nbsp;|&nbsp;</el-text>
    <el-checkbox v-model="requestByInverval">定时更新</el-checkbox>
    <el-text v-if="requestByInverval">&nbsp;|&nbsp;</el-text>
    <el-text v-if="requestByInverval">定时周期：{{ timerSeconds }}秒</el-text>
    <el-text>&nbsp;|&nbsp;</el-text>
    <el-checkbox v-model="proxyEnable">开启代理</el-checkbox>
    &nbsp;&nbsp;
    <el-text><el-input v-if="proxyEnable" v-model="proxySetting"></el-input></el-text>
    &nbsp;&nbsp;
    <el-button v-if="buttonShowFlag && !!proxySetting" @click="applyProxy">测试&应用代理</el-button>
  </el-row>
  <!-- 24 小时变化 -->
  <el-row>
    <el-button class="refreshButton" @click="hour24">刷新</el-button>
    &nbsp;&nbsp;
    <el-text>最近更新时间：{{ hour24UpdateTimeFormated }}</el-text>
  </el-row>
  <el-row :gutter="20" :border="true" :stripe="true">
    <el-col :span="12">
      <el-text>TOP 10</el-text>
      <el-table :data="change24HoursTop10">
        <el-table-column prop="symbol" label="名称" width="100" show-overflow-tooltip :formatter="symbolFormat" />
        <el-table-column prop="lastPrice" label="价格" width="100" show-overflow-tooltip :formatter="priceFormat" />
        <el-table-column prop="priceChangePercent" label="24h变化(%)" show-overflow-tooltip />
        <el-table-column prop="m5ChangePercent" label="5m变化(%)" show-overflow-tooltip />
        <el-table-column prop="m10ChangePercent" label="10m变化(%)" show-overflow-tooltip />
      </el-table>
    </el-col>
    <el-col :span="12">
      <el-text>TOP -10</el-text>
      <el-table :data="change24HoursTail10">
        <el-table-column prop="symbol" label="名称" width="100" show-overflow-tooltip :formatter="symbolFormat" />
        <el-table-column prop="lastPrice" label="价格" width="100" show-overflow-tooltip :formatter="priceFormat" />
        <el-table-column prop="priceChangePercent" label="24h变化(%)" show-overflow-tooltip />
        <el-table-column prop="m5ChangePercent" label="5m变化(%)" show-overflow-tooltip />
        <el-table-column prop="m10ChangePercent" label="10m变化(%)" show-overflow-tooltip />
      </el-table>
    </el-col>
  </el-row>

  <!-- 移动窗口价格 -->
  <el-row>
    <el-button class="refreshButton" @click="window">刷新</el-button>
    &nbsp;&nbsp;
    <el-text>最近更新时间：{{ windowUpdateTimeFormated }}</el-text>
  </el-row>
  <el-row :gutter="20" :border="true" :stripe="true">
    <el-col :span="8">
      <el-table :data="windowPrice5m">
        <el-table-column prop="symbol" label="名称" width="100" show-overflow-tooltip :formatter="symbolFormat" />
        <el-table-column prop="lastPrice" label="价格" width="120" show-overflow-tooltip :formatter="priceFormat" />
        <el-table-column prop="priceChangePercent" label="5m变化(%)" show-overflow-tooltip />
      </el-table>
    </el-col>
    <el-col :span="8">
      <el-table :data="windowPrice30m">
        <el-table-column prop="symbol" label="名称" width="100" show-overflow-tooltip :formatter="symbolFormat" />
        <el-table-column prop="lastPrice" label="价格" width="120" show-overflow-tooltip :formatter="priceFormat" />
        <el-table-column prop="priceChangePercent" label="30m变化(%)" show-overflow-tooltip />
      </el-table>
    </el-col>
    <el-col :span="8">
      <el-table :data="windowPrice60m">
        <el-table-column prop="symbol" label="名称" width="100" show-overflow-tooltip :formatter="symbolFormat" />
        <el-table-column prop="lastPrice" label="价格" width="120" show-overflow-tooltip :formatter="priceFormat" />
        <el-table-column prop="priceChangePercent" label="60m变化(%)" show-overflow-tooltip />
      </el-table>
    </el-col>
  </el-row>

  <div v-for="item in allSymbols">
    <el-text>{{ item }}</el-text>
  </div>
</template>

<style lang="scss" scoped>
.refreshButton {
  margin: 10px 0;
}
</style>
