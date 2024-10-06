<script setup lang="ts">
import Sortable from "sortablejs"
import { ref, onMounted, watch, h, computed, toRaw } from 'vue'
import { Exchange, PriceData } from '../types'
import { Column, ElText, TableColumnCtx, ElIcon, TableV2FixedDir } from "element-plus"
import { CellRendererParams, HeaderCellRendererParams } from 'element-plus/es/components/table-v2/src/types'

const exchanges = ref<Exchange[]>([
  {
    name: 'Binance', url: 'https://api.binance.com/api/v3/ticker/price', parser: (data: any) => {
      return data.filter((item: any) => item.symbol.endsWith('USDT'))
        .map((item: any) => ({ symbol: item.symbol.replace('USDT', ''), price: parseFloat(item.price) }))
        .sort((a: { price: number }, b: { price: number }) => b.price - a.price)
    }
  },
  {
    name: 'OKX', url: 'https://www.okx.com/api/v5/market/tickers?instType=SPOT', parser: (data: any) => {
      return data.data.filter((item: any) => item.instId.endsWith('USDT'))
        .map((item: any) => ({ symbol: item.instId.replace('-USDT', ''), price: parseFloat(item.last) }))
        .sort((a: { price: number }, b: { price: number }) => b.price - a.price)
    }
  },
  {
    name: 'Bitget', url: 'https://api.bitget.com/api/spot/v1/market/tickers', parser: (data: any) => {
      return data.data.filter((item: any) => item.symbol.endsWith('USDT'))
        .map((item: any) => ({ symbol: item.symbol.replace('USDT', ''), price: parseFloat(item.close) }))
        .sort((a: { price: number }, b: { price: number }) => b.price - a.price)
    }
  },
  {
    name: 'CoinEx', url: 'https://api.coinex.com/v2/spot/ticker', parser: (data: any) => {
      return data.data.filter((item: any) => item.market.endsWith('USDT'))
        .map((item: any) => ({ symbol: item.market.replace('USDT', ''), price: parseFloat(item.last) }))
        .sort((a: { price: number }, b: { price: number }) => b.price - a.price)
    }
  },
  {
    name: 'GateIO', url: 'https://api.gateio.ws/api/v4/spot/tickers?timezone=utc8', parser: (data: any) => {
      return data.filter((item: any) => item.currency_pair.endsWith('USDT'))
        .map((item: any) => ({ symbol: item.currency_pair.replace('_USDT', ''), price: parseFloat(item.last) }))
        .sort((a: { price: number }, b: { price: number }) => b.price - a.price)
    }
  },
  {
    name: 'Huobi', url: 'https://api.huobi.pro/market/tickers', parser: (data: any) => {
      return data.data.filter((item: any) => item.symbol.endsWith('usdt'))
        .map((item: any) => ({ symbol: item.symbol.replace('usdt', '').toUpperCase(), price: parseFloat(item.close) }))
        .sort((a: { price: number }, b: { price: number }) => b.price - a.price)
    }
  },
])

const starCacheKey = 'starPriceData'
const priceData = ref<Record<string, PriceData[]>>({})
const starPriceData = ref<PriceData[]>([])
const errors = ref<Record<string, string>>({})

const fetchPrices = async (exchange: Exchange) => {
  try {
    updateTime.value = new Date().toLocaleString()
    const response = await fetch(exchange.url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    priceData.value[exchange.name] = exchange.parser(data)
    errors.value[exchange.name] = ''
  } catch (error) {
    console.error(`Error fetching data from ${exchange.name}:`, error)
    errors.value[exchange.name] = `Failed to fetch data from ${exchange.name}`
    priceData.value[exchange.name] = []
  }
}

function addStar(symbol: string) {
  let exists = false
  for (let i = 0; i < starPriceData.value.length; i++) {
    const item = starPriceData.value[i]
    if (item.exchange === selectedCexOption.value && item.symbol === symbol) {
      exists = true
      break
    }
  }
  if (!exists) {
    starPriceData.value.push({ exchange: selectedCexOption.value, symbol: symbol, key: `${selectedCexOption.value}_${symbol}` })
    localStorage.setItem(starCacheKey, JSON.stringify(starPriceData.value))
  }
}

function unstar(key: string) {
  console.log('unstar', key)

  for (let i = 0; i < starPriceData.value.length; i++) {
    const item = starPriceData.value[i]
    if (item.key === key) {
      starPriceData.value.splice(i, 1)
      localStorage.setItem(starCacheKey, JSON.stringify(starPriceData.value))
      break
    }
  }
}

const columns: Column<any>[] = [
  {
    key: 'star',
    title: '',
    dataKey: 'symbol',
    width: 50,
    cellRenderer: (params: CellRendererParams<string>) => {
      const data: string = params.cellData
      return h(ElText, { class: 'star-btn', onClick: () => addStar(data) }, { default: () => h('span', {}, { default: () => '✰' }) })
    },
  }, {
    key: 'symbol',
    title: 'symbol',
    dataKey: 'symbol',
    width: 300,
    headerCellRenderer: (params: HeaderCellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.column.title] })
    },
    cellRenderer: (params: CellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.cellData] })
    },
  }, {
    key: 'price',
    title: 'price',
    dataKey: 'price',
    width: 300,
    headerCellRenderer: (params: HeaderCellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.column.title] })
    },
    cellRenderer: (params: CellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.cellData] })
    },
  },
]

const starColumns: Column<any>[] = [
  {
    key: 'unstar',
    title: '',
    dataKey: 'key',
    width: 50,
    cellRenderer: (params: CellRendererParams<string>) => {
      const data: string = params.cellData
      return h(ElText, { class: 'star-btn handleDrag', onClick: () => unstar(data) }, { default: () => h('span', {}, { default: () => '❤️' }) })
    },
  }, {
    key: 'exchange',
    title: 'exchange',
    dataKey: 'exchange',
    width: 150,
    headerCellRenderer: (params: HeaderCellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.column.title] })
    },
    cellRenderer: (params: CellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.cellData] })
    },
  }, {
    key: 'symbol',
    title: 'symbol',
    dataKey: 'symbol',
    width: 300,
    headerCellRenderer: (params: HeaderCellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.column.title] })
    },
    cellRenderer: (params: CellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.cellData] })
    },
  }, {
    key: 'price',
    title: 'price',
    dataKey: 'price',
    width: 300,
    headerCellRenderer: (params: HeaderCellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.column.title] })
    },
    cellRenderer: (params: CellRendererParams<number | string>) => {
      return h(ElText, {}, { default: () => [params.cellData] })
    },
  },
]

const search = ref('')
const selectedCexOption = ref(exchanges.value[0].name)

async function selectChanged(value: string) {
  await updateOnePrices()
}
const count = ref(0)
const computedTickers = computed(() => {
  let result: PriceData[] = priceData.value[selectedCexOption.value] || []
  if (search.value) {
    result = result.filter(x => x.symbol!.toLowerCase().indexOf(search.value.toLowerCase()) > -1)
  }
  count.value = result.length
  return result
})

const staredTickers = computed(() => {
  let result: PriceData[] = []
  for (let i = 0; i < starPriceData.value.length; i++) {
    const starItem = starPriceData.value[i]
    let symbolItems: PriceData[] = priceData.value[starItem.exchange || ''] || []
    let matchedItems = symbolItems.filter(x => x.symbol === starItem.symbol)
    if (matchedItems.length > 0) {
      result.push({ ...starItem, price: matchedItems[0].price } as PriceData)
    }
  }
  return result
})

const updateTime = ref(new Date().toLocaleString())
const updateOnePrices = async () => {
  await fetchPrices(exchanges.value.filter(ex => selectedCexOption.value === ex.name)[0])
}

const updateAllPrices = async () => {
  exchanges.value.forEach(fetchPrices)
}

function dragSort() {
  const el = document.querySelector("#dragTable table tbody")
  if (el instanceof HTMLElement) {
    new Sortable(el, {
      sort: true,
      handle: ".handleDrag",
      ghostClass: "sortable-ghost",
      onEnd: (e: any) => {
        const targetRow = starPriceData.value.splice(e.oldIndex, 1)[0]
        starPriceData.value.splice(e.newIndex, 0, targetRow)
        localStorage.setItem(starCacheKey, JSON.stringify(starPriceData.value))
      },
    })
  } else {
    console.error("Element not found or invalid.")
  }
}

onMounted(updateAllPrices)
onMounted(() => {
  dragSort()
  starPriceData.value = JSON.parse(localStorage.getItem(starCacheKey) || '[]')
})

// watch(() => exchanges.value, updatePrices, { deep: true })

setInterval(updateAllPrices, 10000) // Update prices every 10 seconds
</script>

<template>
  <div class="price-board">
    <div class="row">
      <el-select class="col" v-model="selectedCexOption" placeholder="列过滤" size="small" style="width: 150px"
        :clearable="true" @change="selectChanged">
        <template v-for="item in exchanges" :key="item.prop">
          <el-option :label="item.name" :value="item.name" />
        </template>
      </el-select>
      <el-input class="col search" size="small" v-model="search" :clearable="true" :placeholder="'搜索 Symbol'" />
      <el-text class="col">共 {{ count }} 行</el-text>
      <el-text class="col">更新时间：{{ updateTime }}</el-text>
    </div>
    <div class="row">
      <el-table-v2 :columns="columns" :data="computedTickers || []" :width="500" :height="900" />
      <!-- <el-table-v2 :columns="starColumns" :data="staredTickers || []" :width="500" :height="900" /> -->
      <el-table id="dragTable" style="font-weight: bold; width: 500px;" :data="staredTickers" :row-key="item => item.key"
        empty-text="暂无数据">
        <el-table-column label="" width="40px" :show-overflow-tooltip="true">
          <template #default="scope">
            <el-text>❤️</el-text>
          </template>
        </el-table-column>
        <el-table-column label="exchange" prop="exchange" width="100px" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column label="symbol" prop="symbol" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column label="price" prop="price" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="scope">
            <el-button size="small" class="handleDrag" title="移动">
              <el-icon>
                <Sort />
              </el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.price-board {
  min-width: 1100px;
}

::v-deep(.el-table tr) {
  height: 50px;
  /* 设置行高 */
}

.row {
  display: flex;
  position: relative;
  margin-bottom: 10px;
}

.col:nth-child(n + 2) {
  margin-left: 10px;
}

.search {
  width: 200px;
}

.star-btn {
  cursor: pointer;
}
</style>