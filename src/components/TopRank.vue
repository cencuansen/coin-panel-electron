<script setup lang="ts">
import { numberFormat, percentageFormat } from "../utils/format"

defineProps({
  color: {
    type: String as () => "success" | "warning" | "info" | "primary" | "danger" | undefined,
    default: undefined
  },
  title: String,
  data: Array,
})

const colorType = (value: number) => value >= 0 ? 'success' : 'danger';

</script>

<template>
  <el-text :type="color">{{ title }}</el-text>
  <el-table :data="data">
    <el-table-column prop="symbol" label="名称" width="150" show-overflow-tooltip />
    <el-table-column prop="lastPrice" label="价格" width="100" show-overflow-tooltip :formatter="numberFormat" />
    <el-table-column label="24小时" width="100" show-overflow-tooltip>
      <template #default="scope">
        <el-text :type="colorType(scope.row.priceChangePercent)">{{ scope.row.priceChangePercent }}%</el-text>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped lang="scss"></style>