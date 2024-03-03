<script setup lang="ts">
import axios from 'axios'
import { ipcRenderer } from 'electron'
import { ref, watch } from 'vue'

const devtoolsStatus = ref<boolean>(false)
const alwaysOnTop = ref<boolean>(false)
const proxySetting = ref<string>("127.0.0.1:10800")
const proxyEnable = ref<boolean>(true)
const proxyStatusOk = ref<boolean>(false)
const buttonShowFlag = ref<boolean>(false)
const proxyCheckServer = "https://www.google.com"

watch(devtoolsStatus, (newVal) => {
    ipcRenderer.send("toggle-devtools", newVal)
})

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

</script>

<template>
    <div>
        <el-row><el-checkbox v-model="devtoolsStatus">devtools</el-checkbox></el-row>
        <el-row><el-checkbox v-model="alwaysOnTop">置顶</el-checkbox></el-row>
        <el-row style="display: flex; align-items: center;">
            <el-checkbox v-model="proxyEnable">代理</el-checkbox>
            <span v-if="proxyEnable">&nbsp;&nbsp;</span>
            <el-input v-if="proxyEnable" v-model="proxySetting" size="small" style="width: 110px;height: 24px;"></el-input>
            <span v-if="buttonShowFlag && !!proxySetting">&nbsp;&nbsp;</span>
            <el-button v-if="buttonShowFlag && !!proxySetting" @click="applyProxy" style="height: 24px;">应用</el-button>
        </el-row>
    </div>
</template>

<style scoped lang="scss"></style>