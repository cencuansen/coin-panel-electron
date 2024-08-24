<script setup lang="ts">
import { DefineComponent, ref } from 'vue'
import Favorites from './components/Favorites.vue'
import Lists from './components/Lists.vue'
import Settings from './components/Settings.vue'

const components = ref<{ [key: string]: DefineComponent<any, any, any> }>({
  "favorites": Favorites,
  "lists": Lists,
  "settings": Settings,
})

const currentComponentName = ref<string>("favorites")
const currentComponent = ref<DefineComponent<any, any, any>>(Favorites)

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
  height: 97vh;
  position: relative;
  user-select: none;
  min-width: 180px;
}

.middle-item-group {
  height: calc(100% - 35px);
}

.buttom-item-group {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 35px;
  width: 100%;
}
</style>
