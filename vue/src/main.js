// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
// import Vue from 'vue-dev/dist/vue'
// import Vue from 'vue-dev/dist/vue.runtime.esm'
import App from './App'

import Icon from './ui/Icon'
import ScrollArea from './ui/ScrollArea2'

import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import colors from 'vuetify/es5/util/colors'

Vue.use(Vuetify)


function requireAll (requireContext) {
  return requireContext.keys().map(requireContext)
}
requireAll(require.context('../icons', false, /.*\.svg$/))
requireAll(require.context('../icons/musical', false, /.*\.svg$/))
requireAll(require.context('../icons/percussion', false, /.*\.svg$/))

// Disable ripple ink effect by overriding Vuetify's directive
Vue.directive('ripple', (el, binding) => {})
Vue.component('icon', Icon)
Vue.component('scroll-area', ScrollArea)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  components: { App },
  render: h => h(App)
})
