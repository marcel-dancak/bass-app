<template>
  <v-flex>
    <v-select
      ref="select"
      class="note-select"
      content-class="note-select"
      :label="label"
      :items="items"
      item-value="fret"
      v-model="selected"
      hide-details>
      <span
        slot="selection"
        slot-scope="data"
        class="input-group__selection">
        {{ note.name }}<sub>{{ note.octave }}</sub>
      </span>
      <template
        slot="item"
        slot-scope="data">
        <span
          class="fret"
          @click.stop="">({{ data.item.fret }})
        </span>
        <span class="note" @click.stop="selectItem(data.item)">
          {{ data.item.name }}<sub>{{ data.item.octave }}</sub>
        </span>
        <template v-if="data.item.flatName">
          <span>/</span>
          <span class="note" @click.stop="selectItem(data.item, true)">
            {{ data.item.flatName }}<sub>{{ data.item.octave }}</sub>
          </span>
        </template>
      </template>
    </v-select>
  </v-flex>
</template>

<script>
import { Note } from 'tonal'

export default {
  props: {
    label: String,
    root: String,
    note: Object,
    length: {
      type: Number,
      default: 24
    }
  },
  data: () => ({
    selected: -1
  }),
  computed: {
    items () {
      const items = []
      const startCode = Note.midi(this.root)
      for (let i = 0; i < this.length; i++) {
        const note = Note.props(Note.fromMidi(startCode + i))
        const item = {
          fret: i,
          octave: note.oct,
          name: note.pc
        }
        const enharmonic = Note.enharmonic(item.name)
        if (enharmonic !== item.name) {
          item.flatName = item.name.replace('b', '♭')
          item.name = enharmonic.replace('#', '♯')
        }
        items.push(item)
      }
      return items
    }
  },
  created () {
    this.selected = this.note.fret
  },
  methods: {
    selectItem (item, flatName = false) {
      // data.parent.$emit('change', data.item)
      // data.parent.$emit('input', data.item)
      // data.parent.$refs.menu.$emit('update:returnValue', undefined)
      // data.parent.$refs.menu.$emit('input', false)
      this.note.name = flatName ? item.flatName : item.name
      this.note.octave = item.octave
      this.note.fret = item.fret

      this.$refs.select.selectItem(item)
      this.$refs.select.hideMenu()
    }
  }
}
</script>

<style lang="scss">
.note-select {
  .input-group__selection {
    color: rgba(0,0,0,0.87);
  }
  .list__tile {
    height: 3em;
    padding: 0;
    .fret {
      opacity: 0.35;
      padding-left: 0.5em;
    }
    > * {
      height: inherit;
      line-height: 3em;
    }
    .note {
      padding-left: 1em;
      flex-grow: 1;
      min-width: 4em;
    }
  }
}
</style>
