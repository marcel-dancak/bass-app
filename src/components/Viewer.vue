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
        swipeable
      >
        <div
          v-for="item in props.item"
          :key="item.position"
          class="beat layout column"
        >
          <beat-header
            :beat="item.beat"
            :active="item.position === activeBeatId ? activeSubbeat : ''"
            :xactive="activeSection === `${ item.sectionId }_${ item.repeat }` ? activeSubbeat : ''"
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
      activeSection: null,
      activeBeatId: -1
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
      const track = this.app.track.id
      const slides = []
      let beats = []
      let counter = 0
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
              position: counter++
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

    async play () {
      if (this.$player.playing) {
        return this.stop()
      }
      await this.fetchResources()
      const { swiper } = this.$refs

      let playbackPosition = null

      const playbackBeat = (beat, index) => ({
        section: beat.section,
        bar: beat.beat.bar,
        beat: beat.beat.beat,
        index
      })
      this.$player.playStream(
        // next beat playback
        (startTime) => {
          const lastScreenBeatId = (swiper.index + this.slidesPerView) * this.beatsPerSlide - 1

          if (!playbackPosition || (this.app.player.loopMode && playbackPosition.index === lastScreenBeatId)) {
            if (playbackPosition && !this.app.player.screenLock && playbackPosition.index === lastScreenBeatId) {
              swiper.setIndex(0)
            }
            // play from first beat on screen
            const startBeat = this.slides[swiper.index][0]
            return playbackBeat(startBeat, swiper.index * this.beatsPerSlide)
          } else {
            if (!this.app.player.loopMode && playbackPosition.index === lastScreenBeatId) {
              return
            }

            // continue playback with next beat
            const nextIndex = playbackPosition.index + 1
            const slideIndex = parseInt(nextIndex / this.beatsPerSlide)
            const beatIndex = nextIndex % this.beatsPerSlide

            if (!this.app.player.screenLock && slideIndex !== swiper.index) {
              swiper.setIndex(slideIndex)
            }
            return playbackBeat(this.slides[slideIndex][beatIndex], nextIndex)
          }
        },
        (e) => {
          this.highlightBeat(e)
          playbackPosition = e
        }
      )
    },
    stop () {
      this.$player.stop()
    },
    highlightBeat (e) {
      const beat = e.section.tracks[this.app.track.id].beat(e.bar, e.beat)
      const subbeatTime = 1000 * (e.duration / beat.subdivision)
      let delay = 1000 * (e.startTime - this.$player.context.currentTime)

      for (let i = 0; i < beat.subdivision; i++) {
        setTimeout(() => {
          this.activeBeatId = e.index
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
