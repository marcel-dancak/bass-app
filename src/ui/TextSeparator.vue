<template functional>
  <v-layout class="text-separator" @click.stop="">
    <v-spacer class="start"/>
    <span><slot></slot></span>
    <v-spacer class="end"/>
  </v-layout>
</template>

<script>
export default {
  functional: true
}
</script>

<style lang="scss" scoped>
.text-separator {
  align-items: center;
  font-size: 70%;
  opacity: 0.4;
  .spacer {
    height: 1px;
    background-color: currentColor;
    margin: 0 0.5em;
    padding: 0;
    opacity: inherit;
    &.end {
      max-width: 2em;
    }
  }
}
</style>
