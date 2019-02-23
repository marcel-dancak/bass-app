<template>
  <div class="drums">
    <div v-for="drum in instrument.drums" :key="drum.name">
      <icon :name="drum.name" />
    </div>
  </div>
</template>

<script>

export default {
  props: ['instrument'],
  computed: {
    drums () {
      console.log(this.instrument.drums)
      return []
    }
  }
}
</script>

<style lang="scss">
.drums {
  .icon {
    font-size: 1em;
    width: 3em;
    height: 3em;
  }
}
</style>
