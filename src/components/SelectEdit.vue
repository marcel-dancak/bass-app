<template> 
  <v-select
    :class="{'v-input--is-focused': focus, 'primary--text': focus}"
    v-bind="_props"
    @input="$emit('input', $event)"
    hide-details
  >
    <input
      slot="selection"
      slot-scope="{ item }"
      style="width: 160px;pointer-events:auto"
      :value="edit"
      @input="$emit('update:edit', $event.target.value)"
      @mousedown.stop="focus = true"
      @click.stop="focus = true"
      @blur="focus = false"
    />
  </v-select>
</template>

<script>
export default {
  name: 'select-edit',
  props: ['label', 'items', 'value', 'itemText', 'itemValue', 'returnObject', 'edit'],
  data () {
    return {
      focus: false
    }
  }
}
</script>

<style lang="scss" scoped>
.v-input--is-focused {
  /deep/ .v-input__slot {
    label {
      color: inherit;
    }
  }
}
</style>
