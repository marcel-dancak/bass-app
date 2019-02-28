<template> 
  <v-select
    class="sections"
    :class="{'input-group--focused': focus}"
    v-bind="_props"
    @input="$emit('input', $event)"
    hide-details
  >
    <input
      slot="selection"
      slot-scope="{ item }"
      style="width: 160px"
      :value="edit"
      @input="$emit('update:edit', $event.target.value)"
      @keydown.enter.stop=""
      @keydown.space.stop=""
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
