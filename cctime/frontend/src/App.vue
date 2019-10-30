<template>
  <div id="q-app">
    <header></header>
    <router-view />
    <!-- possible curtain layer -->
    <div class="curtain"></div>
  </div>
</template>

<script>
import header from './components/header/header'

export default {
  name: 'App',
  components: {
    header,
  }
}
</script>

<style lang="stylus" scoped>

</style>
