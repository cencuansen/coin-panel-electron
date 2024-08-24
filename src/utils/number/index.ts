export function paddingZero(num: number) {
    if (num < 10) {
        return `0${num}`
    } else {
        return `${num}`
    }
}

export function numberFormat(price: number | string | undefined): string {
    if (price === null || price === undefined) {
        return ""
    }
    let num = Number(price)
    if (isNaN(num)) {
        return ""
    }
    const scale = 5
    if (Math.abs(num) >= 1) {
        return num.toFixed(scale)
    } else {
        if (num * 1000 < 1) {
            let fractionals: string[] = ("" + price).split(".")
            if (fractionals.length === 1) {
                return num.toFixed(scale)
            }
            const fractional = fractionals[1]
            let nonZeroIndex: number = fractional.split("").findIndex(c => Number(c) > 0)
            let nonZeroPart = fractional.substring(nonZeroIndex, Math.min(nonZeroIndex + 3, fractional.length))
            return `0.0{${nonZeroIndex}}${nonZeroPart}`
        }
    }
    return num.toFixed(scale)
}