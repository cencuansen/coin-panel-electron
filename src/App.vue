<script setup lang="ts">
import { DefineComponent, shallowRef, ref } from 'vue'
import Favorites from './components/Favorites.vue'
import Lists from './components/Lists.vue'
import Settings from './components/Settings.vue'
import PriceBoard from './components/PriceBoard.vue'

const components = shallowRef<{ [key: string]: DefineComponent<any, any, any> }>({
  "favorites": Favorites,
  "lists": Lists,
  "settings": Settings,
  "priceBoard": PriceBoard,
})
const currentComponent = shallowRef<DefineComponent<any, any, any>>(Favorites)

const currentComponentName = ref<string>("favorites")


function switchComponent(name: string) {
  currentComponentName.value = name
  currentComponent.value = components.value[name]
}

const buttonType = (name: string) => currentComponentName.value === name ? 'primary' : 'default'

</script>

<template>
  <div class="main-body">
    <div class="middle-item-group">
      <keep-alive>
        <component :is="currentComponent" />
      </keep-alive>
    </div>

    <div class="buttom-item-group">
      <el-row>
        <el-button :type="buttonType('favorites')" size="small" @click="switchComponent('favorites')" title="自选">
          <el-icon>
            <Star />
          </el-icon>
        </el-button>
        <el-button :type="buttonType('lists')" size="small" @click="switchComponent('lists')" title="全部">
          <el-icon>
            <List />
          </el-icon>
        </el-button>
        <el-button :type="buttonType('priceBoard')" size="small" @click="switchComponent('priceBoard')" title="更多行情">
          <el-icon>
            <More />
          </el-icon>
        </el-button>
        <el-button :type="buttonType('settings')" size="small" @click="switchComponent('settings')" title="设置">
          <el-icon>
            <Setting />
          </el-icon>
        </el-button>
      </el-row>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.main-body {
  height: 99vh;
  position: relative;
  user-select: none;
  min-width: 180px;
}

.middle-item-group {
  height: calc(100% - 30px);
}

.buttom-item-group {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 30px;
  width: 100%;
}
</style>
