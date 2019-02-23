<template functional>
  <svg
    class="trapezoid"
    viewBox="0 0 102 55"
    preserveAspectRatio="none"
    width="113%"
    height="130%">
    <defs>
      <filter id="f3" x="-5%" y="0" width="110%" height="115%">
        <feOffset result="offOut" in="SourceAlpha" dx="0" dy="-0.5" />
        <feGaussianBlur result="blurOut" in="offOut" stdDeviation="2" />
      </filter>
    </defs>
    <path
      d="
      M96.5,0
      L93,42
      a5,12 0 0 1 -3.5,8
      L12,50
      a5,12 0 0 1 -3.5,-8
      L5,0"
      filter="url(#f3)">
    </path>
    <path
      class="fill"
      d="
      M98,0
      a2,4 0 0 1 0.5,4
      L94,42
      a4,11 0 0 1 -3,8
      L11,50
      a4,11 0 0 1 -3,-8
      L3,4
      a2,4 0 0 1 0.5,-4z">
    </path>
  </svg>
</template>

<script>
export default {
  functional: true
}
</script>

<style lang="scss" scoped>
.trapezoid {
  position: absolute;
  left: -24px;
  right: 0;
  top: -1px;
  bottom: 0;

  .fill {
    stroke: #ccc;
    stroke-width: 0.2;
    fill: #3b4d55;
  }
}
</style>
