<template>
  <div class="beat-header">
    <label v-if="beat.beat === 1">{{ beat.bar }}</label>
    <div
      v-for="(subbeat, i) in subbeats"
      :key="i"
      class="subbeat"
      :class="{active: active === subbeat.id}">
      {{ subbeat.label }}
    </div>
  </div>
</template>

<script>
const Subbeats = {
  3: ['trip', 'let'],
  4: ['e', 'and', 'a']
}

export default {
  name: 'beat-header',
  props: ['beat', 'active'],
  computed: {
    subbeats () {
      const beat = this.beat
      // return [beat.beat].concat(Subbeats[beat.subdivision])
      return [beat.beat].concat(Subbeats[beat.subdivision])
        .map((label, i) => ({
          label,
          id: `${beat.bar}:${beat.beat}:${i + 1}`
        }))
    }
  }
}
</script>

<style lang="scss">
.beat-header {
  position: relative;
  font-size: 1em;
  display: flex;
  margin-top: 1.5em;
  height: 3em;
  min-height: 2.5em;
  xflex-shrink: 0;
  box-sizing: content-box;
  color: #777;

  xbackground-color: #eee;
  > label {
    position: absolute;
    border-radius: 50%;
    background-color: #444;
    color: #fff;
    width: 20px;
    height: 20px;
    line-height: 20px;
    font-size: 14px;
    top: -24px;
    left: -9px;
  }

  .subbeat {
    flex: 1;
    height: 80%;
    line-height: 1.5em;
    border-left: 1px solid #bbb;
    &:first-of-type {
      height: 100%;
      color: #333;
      font-weight: bold;
      font-size: 1.25em;
      border-left: none;
    }
    &.active {
      background-color: #FFF9C4;
    }
  }
}
</style>
