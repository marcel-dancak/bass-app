<template functional>
  <svg class="icon">
    <use :xlink:href="`#${props.name}`" />
  </svg>
</template>

<script>
export default {
  functional: true,
  props: ['name']
}
</script>

<style>
.icon {
  fill: currentColor;
}
</style>
