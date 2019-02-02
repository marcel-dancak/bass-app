<template>
  <div class="viewer">
    <swiper
      ref="swiper"
      :per-view="slidesPerView"
      :checkSwipeable="true"
      :items="slides"
      direction="vertical"
    >
      <div
        slot="item"
        slot-scope="props"
        class="slide layout row"
        swipeable>
        <div
          v-for="item in props.item"
          class="beat layout column"
        >
          <beat-header
            :beat="item.beat"
            :active="activeSection === `${ item.sectionId }_${ item.repeat }` ? activeSubbeat : ''"
          />
          <div
            class="instrument"
            :is="beatComponent"
            :beat="item.beat"
            :instrument="app.track"
            :display="app.label"
          />
        </div>
      </div>

    </swiper>
    <transition name="r-slide">
      <PlaylistEditor
        v-if="app.viewer.playlistEditor"
        :playlist="playlist"
        :project="app.project"
      />
    </transition>
  </div>
</template>

<script>
import { Section } from '../core/section'
import Swiper from './swiper/Swiper'
import PlaylistEditor from './viewer/PlaylistEditor'
import BeatHeader from './BeatHeader'
import BassBeat from './viewer/BassBeat'
import DrumBeat from './viewer/DrumBeat'

const BeatComponents = {
  bass: 'bass-beat',
  drums: 'drum-beat'
}

export default {
  components: { Swiper, BeatHeader, BassBeat, DrumBeat, PlaylistEditor },
  data () {
    return {
      slidesPerView: 2,
      beatsPerSlide: 8,
      activeSubbeat: '',
      activeSection: null
    }
  },
  computed: {
    $player () {
      return this.$service('player')
    },
    $project () {
      return this.$service('project')
    },
    app () {
      return this.$store
    },
    playlist () {
      return this.$store.viewer.playlist
    },
    beatComponent () {
      return BeatComponents[this.app.track.type]
    },
    sections () {
      const sections = {}
      this.playlist.items.forEach(item => {
        if (!sections[item.section]) {
          sections[item.section] = Section(this.$project.getSectionData(item.section))
        }
      })
      return sections
    },
    slides () {
      const project = this.app.project
      const track = this.app.track.id
      const slides = []
      let beats = []
      this.playlist.items.forEach((item, index) => {

        const section = this.sections[item.section]
        const sBeats = section.tracks[track].beats
        for (let i = 1; i <= item.repeats; i++) {
          sBeats.forEach(b => {
            beats.push({
              beat: b,
              section,
              sectionId: item.section,
              repeat: i,
              playlistIndex: index,
            })
            if (beats.length === this.beatsPerSlide) {
              slides.push(beats)
              beats = []
            }
          })
        }
      })
      return slides
    }
  },
  created () {
    this.$bus.$on('playbackChange', this.play)
    this.$bus.$on('playerBack', this.seekToStart)
  },
  beforeDestroy () {
    this.$bus.$off('playbackChange', this.play)
    this.$bus.$off('playerBack', this.seekToStart)
  },
  methods: {
    fetchResources () {
      const resources = new Set()
      Object.values(this.sections).forEach(section => {
        this.$player.collectResources(section).forEach(r => resources.add(r))
      })
      return this.$player.fetchResources(Array.from(resources))
    },
    play () {
      if (this.$player.playing) {
        return this.stop()
      }
      const { swiper } = this.$refs
      const startBeat = this.slides[swiper.index][0]
      const start = {
        bar: startBeat.beat.bar,
        beat: startBeat.beat.beat
      }
      const startSlide = this.slides[swiper.index]
      this.playbackPosition = {
        slide: swiper.index,
        slidePosition: 0,
        item: startBeat
      }
      // this.activeSection = startBeat.sectionId + '_' + startBeat.repeat
      this.fetchResources().then(() => {
        this.$player.play(
          startBeat.section,
          (e) => {
            this.activeSection = e.id
            this.highlightBeat(e)

            this.playbackPosition.slidePosition++
            if (!this.app.player.screenLock && this.playbackPosition.slidePosition === this.beatsPerSlide) {
              setTimeout(() => swiper.setIndex(swiper.index + 1), 200)
              // swiper.setIndex(swiper.index + 1)
            }
            if (this.playbackPosition.slidePosition === this.beatsPerSlide) {
              this.playbackPosition.slidePosition = 0
              this.playbackPosition.slide++
            }
            // console.log(this.playbackPosition.slide, this.playbackPosition.slidePosition)
            this.playbackPosition.item = this.slides[this.playbackPosition.slide][this.playbackPosition.slidePosition]

            // const next = this.playbackPosition.item
            // this.activeSection = next.sectionId + '_' + next.repeat
            /*
            // trigger animation on last beat of current slide
            const beats = this.slides[swiper.index]
            const index = beats.findIndex(item => item.beat.bar === e.bar && item.beat.beat === e.beat)
            if (index === beats.length - 1) {
              swiper.setIndex(swiper.index + 1)
            }
            */
          },
          { start, playbackEnd: this.sectionPlaybackEnd, id: startBeat.sectionId + '_' + startBeat.repeat }
        )
      })
    },
    sectionPlaybackEnd () {
      console.log('position', this.playbackPosition.slide, this.playbackPosition.slidePosition)
      const next = this.playbackPosition.item
      // this.activeSection = next.sectionId + '_' + next.repeat
      return {
        section: next.section,
        bar: next.beat.bar,
        beat: next.beat.beat,
        id: next.sectionId + '_' + next.repeat
      }
    },
    stop () {
      this.$player.stop()
    },
    playbackPosition (e) {
      for (let i = 0; i < this.slidesPerView; i++) {
        const slide = this.slides[swiper.index]
        // slide.findIndex(item => item.section === && item.beat.bar === e.bar && item.beat.beat === e.beat)
      }
    },
    highlightBeat (e) {
      const beat = e.section.tracks[this.app.track.id].beat(e.bar, e.beat)
      const subbeatTime = 1000 * (e.duration / beat.subdivision)
      let delay = 1000 * (e.startTime - this.$player.context.currentTime)

      for (let i = 0; i < beat.subdivision; i++) {
        setTimeout(() => {
          this.activeSubbeat = `${e.bar}:${e.beat}:${i + 1}`
        }, delay)
        delay += subbeatTime
      }
    },
    seekToStart () {
      this.$refs.swiper.setIndex(0)
    }
  }
}
</script>

<style lang="scss">
@import "borders.scss";

.viewer {
  flex-grow: 1;
  display: flex;

  .beat {
    flex: 1 0 auto;
    // overflow: hidden;
    > div {
      flex-shrink: 0;
    }
  }
  .swiper {
    padding: 1em 1em 0 1em;
    margin-top: 1em;
    width: 100%;

    .slides-container {
      height: 100%;
    }
    .slide {
      flex-shrink: 0;
    }
  }

  .playlist-editor {
    position: absolute;
    xmin-width: 400px;
    right: 0;
    top: 5em;
  }
}
</style>
