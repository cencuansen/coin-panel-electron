<script setup lang="ts">
import { openLink, allTickersFun } from '@/bitget/apis'
import { Ticker } from '@/bitget/types'
import { onMounted, ref, watch, computed, RendererNode, VNode, h } from "vue"
import { Column, ElText, TableColumnCtx, ElIcon } from "element-plus"
import { numberFormat } from "@/utils/number"

const search = ref('')
const sortColumn = ref<string>('symbol')
const sortType = ref<string>('')
const allTickers = ref<Ticker[]>([])
const count = ref<number>(0)

async function getAllTickers() {
    allTickers.value = []
    const tickers = await allTickersFun()
    doSort(tickers, sortColumn.value, sortType.value)
    allTickers.value = tickers
}

onMounted(async () => {
    getAllTickers()
})

const computedTickers = computed(() => {
    let result: Ticker[] = allTickers.value
    if (search.value) {
        result = result.filter(x => x.symbol.toLowerCase().indexOf(search.value.toLowerCase()) > -1)
    }
    if (selectedOption.value) {
        let min = Number(minValue.value)
        let max = Number(maxValue.value)
        if (minValue.value) {
            result = result.filter(x => x[selectedOption.value] >= min)
        }
        if (max > min) {
            result = result.filter(x => x[selectedOption.value] <= max)
        }
    }
    count.value = result.length
    return result
})

function openLinkHandler(column: string) {
    openLink(column)
}

function headerClick(column: any, e: any) {
    const property: string = column.dataKey
    if (sortColumn.value !== property) {
        sortColumn.value = property
        sortType.value = 'desc'
    } else {
        if (sortType.value === 'desc') {
            sortType.value = 'asc'
        } else {
            sortType.value = 'desc'
        }
    }
    doSort(allTickers.value, sortColumn.value, sortType.value)
}

function doSort(tickers: Ticker[], column: string, sortType: string) {
    if (sortType === '') return
    if (column === 'symbol') {
        tickers.sort((a: Ticker, b: Ticker) => {
            if (sortType === 'asc') {
                return a[column].localeCompare(b[column])
            }
            return b[column].localeCompare(a[column])
        })
    } else {
        tickers.sort((a: Ticker, b: Ticker) => {
            if (sortType === 'asc') {
                return a[column] - b[column]
            }
            return b[column] - a[column]
        })
    }
}

const selectedOption = ref('')
const columnOptions = [
    { label: 'Symbol', prop: 'symbol', disable: true, width: 150 },
    { label: 'Last Price', prop: 'lastPr' },
    { label: 'UTC %', prop: 'changeUtc24h' },
    { label: '24h %', prop: 'change24h' },
    { label: 'Open', prop: 'open' },
    { label: 'Open UTC', prop: 'openUtc' },
    { label: '24h High', prop: 'high24h' },
    { label: '24h Low', prop: 'low24h' },
    { label: 'Base Volume', prop: 'baseVolume' },
    { label: 'Quote Volume', prop: 'quoteVolume' },
    { label: 'USDT Volume', prop: 'usdtVolume' },
    { label: 'Bid', prop: 'bid' },
    { label: 'Ask', prop: 'ask' },
]
const minValue = ref<number | null>()
const maxValue = ref<number | null>()

function selectChanged(value: string) {
    minValue.value = null
    maxValue.value = null
}

const columns: Column<Ticker> = columnOptions.map(op => {
    return {
        dataKey: op.prop,
        title: op.label,
        width: op.width,
        cellRenderer: ({ cellData }: { cellData: string }) =>
            op.prop === 'symbol'
                ? h(ElText, { class: 'symbol-col', onClick: () => openLinkHandler(cellData) }, { default: () => h('a', {}, { default: () => cellData }) })
                : h(ElText, { class: 'number-col', style: ['changeUtc24h', 'change24h'].includes(op.prop) ? { 'color': Number(cellData) >= 0 ? 'green' : 'red' } : {} }, { default: () => numberFormat(cellData) })
        ,
        headerCellRenderer: ({ column }: { column: Column<Ticker> }) => {
            return h(
                ElText,
                { onClick: () => headerClick(column, null) },
                { default: () => [column.title, ' ', column.dataKey === sortColumn.value ? (sortType.value === 'asc' ? '↑' : sortType.value === 'desc' ? '↓' : '') : ''] }
            )
        }
    }
})

</script>

<template>
    <div class="row">
        <el-button class="col" size="small" title="刷新" @click="getAllTickers">
            <el-icon>
                <RefreshRight />
            </el-icon>
        </el-button>
        <el-input class="col search" size="small" v-model="search" :clearable="true" :placeholder="'搜索 Symbol'" />
        <el-select class="col" v-model="selectedOption" placeholder="列过滤" size="small" style="width: 120px"
            :clearable="true" @change="selectChanged">
            <template v-for="item in columnOptions">
                <el-option :key="item.prop" :label="item.label" :value="item.prop" v-if="!item.disable" />
            </template>
        </el-select>
        <el-input v-if="!!selectedOption" class="col" v-model="minValue" style="width: 120px" size="small" placeholder="下限"
            type="number" :clearable="true" />
        <el-input v-if="!!selectedOption" class="col" v-model="maxValue" style="width: 120px" size="small" placeholder="上限"
            type="number" :clearable="true" />
        <el-text class="col">共 {{ count }} 行</el-text>
        <!-- <el-button class="col" size="small" @click="doFilter">过滤</el-button> -->
    </div>
    <el-auto-resizer>
        <template #default="{ height, width }">
            <el-table-v2 :data="computedTickers" :columns="columns" :width="width" :height="height" :row-key="'id'"
                @header-click="headerClick">
                <template #empty>
                    <div class="width: 100%; height: 100%">
                        <el-empty description="空空如也" />
                    </div>
                </template>
            </el-table-v2>
        </template>
    </el-auto-resizer>
</template>

<style scoped lang="scss">
.row {
    display: flex;
    position: relative;
    margin-bottom: 10px;
    align-items: center;
}

.col:nth-child(n + 2) {
    margin-left: 10px;
}

.search {
    width: 200px;
}

:deep(.symbol-col) {
    cursor: pointer;
}

:deep(.symbol-col),
:deep(.number-col) {
    font-weight: bold;
}

:deep(.el-table-v2__header-row),
:deep(.el-table-v2__row) {
    display: flex;
}

:deep(.el-table-v2__header-cell),
:deep(.el-table-v2__row-cell) {
    flex-grow: 1 !important;
    flex-shrink: 1 !important;
    flex-basis: auto !important;
    width: 100%;
}

:deep(.el-table-v2__row-cell > div:first-child) {
    display: none !important;
}
</style>