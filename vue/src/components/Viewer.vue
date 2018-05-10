<template>
  <div class="viewer">
    <swiper
      ref="swiper"
      :per-view="slidesPerView"
      :checkSwipeable="true"
      :items="slides"
      direction="vertical">

      <div
        slot="item"
        slot-scope="props"
        class="slide layout row"
        swipeable>
        <div
          v-for="beat in props.item.beats"
          class="beat flex">
          <beat-header
            :beat="beat"
          />
          <div
            class="instrument"
            :is="beatComponent"
            :beat="beat"
            :instrument="app.track"
            :display="app.label"/>
        </div>
      </div>

    </swiper>
  </div>
</template>

<script>
import { Section } from '../core/section'
import Swiper from './swiper/Swiper'
import BeatHeader from './BeatHeader'
import BassBeat from './viewer/BassBeat'
import DrumBeat from './viewer/DrumBeat'

const BeatComponents = {
  bass: 'bass-beat',
  drums: 'drum-beat'
}

export default {
  components: { Swiper, BeatHeader, BassBeat, DrumBeat },
  props: ['app', 'playlist'],
  data: () => ({
    slidesPerView: 2,
    beatsPerSlide: 8
  }),
  computed: {
    beatComponent () {
      return BeatComponents[this.app.track.type]
    },
    slides () {
      const project = this.app.project
      const track = this.app.track.id
      const slides = []
      let beats = []
      this.playlist.items.forEach(pi => {
        const section = Section(project.getSectionData(pi.section))
        const sBeats = section.tracks[track].beats
        sBeats.forEach(b => {
          beats.push(b)
          if (beats.length === this.beatsPerSlide) {
            slides.push({
              beats
            })
            beats = []
          }
        })
      })
      console.log(slides)
      return slides
      // return this.playlist.items
    }
  }
}
</script>

<style lang="scss">

.viewer {
  flex-grow: 1;
  background-color: rgba(orange, 0.1);
  display: flex;

  .swiper {
    padding: 1em 1em 0 1em;
    margin-top: 1em;
    width: 100%;

    .slides-container {
      height: 100%;
    }
    .slide {
      flex-shring: 0;
    }
  }
}
</style>