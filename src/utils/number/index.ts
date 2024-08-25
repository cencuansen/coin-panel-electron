export function paddingZero(num: number) {
    if (num < 10) {
        return `0${num}`
    } else {
        return `${num}`
    }
}

export function numberFormat(price: number | string | undefined): number | string {
    if (price === null || price === undefined) {
        return ""
    }
    let num = Number(price)
    if (isNaN(num)) {
        return ""
    }
    if (num > 1e9) {
        return `${Math.floor(num / 1e9)}e9`
    } if (Math.abs(num) >= 100) {
        return Number(num.toFixed(2))
    } else if (Math.abs(num) >= 1) {
        return Number(num.toFixed(3))
    } if (Math.abs(num * 1000) < 1) {
        let fractionals: string[] = ("" + price).split(".")
        if (fractionals.length === 1) {
            return Number(num.toFixed(5))
        }
        const fractional = fractionals[1]
        let nonZeroIndex: number = fractional.split("").findIndex(c => Number(c) > 0)
        let nonZeroPart = fractional.substring(nonZeroIndex, Math.min(nonZeroIndex + 3, fractional.length))
        return `0.0{${nonZeroIndex}}${nonZeroPart}`
    }
    return Number(num.toFixed(5))
}