import {ipcRenderer} from "electron";
import axios from "axios/index";
import {ElNotification} from "element-plus";

const proxyCheckServer: string = "https://www.google.com";

// 开启代理
export async function openProxy(value: string) {
    ipcRenderer.send("set-proxy", {
        proxy: value,
        enable: true,
    });
    await proxyStatusCheck();
}

// 关闭代理
export async function closeProxy() {
    ipcRenderer.send("set-proxy", {proxy: null, enable: false,});
}

async function proxyStatusCheck(): Promise<boolean> {
    await axios.head(proxyCheckServer);
    return true;
}