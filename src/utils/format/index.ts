import { TableColumnCtx } from "element-plus"

export function symbolFormat(row: any, column: TableColumnCtx<any>, cellValue: any, index: number): string {
    return (cellValue as string).replace("UPUSDT", "").replace("DOWNUSDT", "").replace("USDT", "")
}

export function numberFormat(row: any, column: TableColumnCtx<any>, cellValue: any, index: number): string {
    return Number(cellValue).toString()
}

export function percentageFormat(row: any, column: TableColumnCtx<any>, cellValue: any, index: number): string {
    return `${cellValue} %`
}