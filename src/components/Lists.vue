<script setup lang="ts">
import { openLink, allTickersFun } from '@/bitget/apis'
import { Ticker } from '@/bitget/types'
import { onMounted, ref, watch, computed } from "vue"

const loading = ref(false)
const search = ref("")
const allTickers = ref<Ticker[]>([])

async function getAllTickers() {
    allTickers.value = []
    allTickers.value = await allTickersFun()
}

onMounted(async () => {
    getAllTickers()
})

const computedTickers = computed(() => {
    if (!search.value) return allTickers.value
    return allTickers.value.filter(x => x.symbol.toLowerCase().indexOf(search.value.toLowerCase()) > -1)
})

function openLinkHandler(column: string) {
    openLink(column)
}

const sortColumn = ref<string>()
const sortType = ref<string>()

function headerClick(column: any, e: any) {
    const property: string = column.property
    if (sortColumn.value !== property) {
        sortColumn.value = property
        sortType.value = 'desc'
    } else {
        if (sortType.value === 'desc') {
            sortType.value = 'asc'
        } else if (sortType.value === 'asc') {
            sortType.value = ''
        } else {
            sortType.value = 'desc'
        }
    }

    if (property === 'symbol') {
        allTickers.value.sort((a: Ticker, b: Ticker) => {
            const valueA = a[property]
            const valueB = b[property]
            if (sortType.value === 'asc') {
                return valueA.localeCompare(valueB)
            } else if (sortType.value === 'desc') {
                return valueB.localeCompare(valueA)
            } else {
                return 0
            }
        })
    } else {
        allTickers.value.sort((a: Ticker, b: Ticker) => {
            const valueA = a[property]
            const valueB = b[property]
            if (sortType.value === 'asc') {
                return valueA - valueB
            } else if (sortType.value === 'desc') {
                return valueB - valueA
            } else {
                return 0
            }
        })
    }
}
</script>

<template>
    <div class="row">
        <el-button class="col" size="small" title="刷新" @click="getAllTickers">
            <el-icon>
                <RefreshRight />
            </el-icon>
        </el-button>
        <el-input class="col search" size="small" v-model="search" :clearable="true" :placeholder="'搜索'" />
    </div>
    <el-table :data="computedTickers" style="width: 100%" height="calc(100vh - 100px)" @header-click="headerClick"
        :row-key="item => item.symbol">
        <el-table-column prop="symbol" label="Symbol" :show-overflow-tooltip="true">
            <template #default="scope">
                <a class="symbol-col" @click="openLinkHandler(scope.row.symbol)">{{ scope.row.symbol }}</a>
            </template>
        </el-table-column>
        <el-table-column prop="high24h" label="24h High" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="open" label="Open" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="low24h" label="24h Low" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="lastPr" label="Last Price" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="quoteVolume" label="Quote Volume" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="baseVolume" label="Base Volume" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="usdtVolume" label="USDT Volume" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="bidPr" label="Bid Price" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="askPr" label="Ask Price" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="bidSz" label="Bid Size" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="askSz" label="Ask Size" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="openUtc" label="Open UTC" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="changeUtc24h" label="UTC 24h" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="change24h" label="24h" width="120" :show-overflow-tooltip="true"></el-table-column>
    </el-table>
    <el-loading :fullscreen="true" :visible="loading" z-index="99"></el-loading>
</template>

<style scoped lang="scss">
.row {
    margin-bottom: 10px;
    display: flex;
}

.col:nth-child(n + 2) {
    margin-left: 10px;
}

.search {
    width: 200px;
}

.symbol-col {
    cursor: pointer;
}
</style>