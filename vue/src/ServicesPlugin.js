
export default {
  install (Vue, options) {
    Vue.prototype.$createService = function (obj, param, bindings = []) {

      // this.$root.services[param] = obj
      Vue.set(this.$root.services, param, obj, null, true)
      Vue.util.defineReactive(this.$root.services, param, obj, null, true)
      bindings.forEach(prop => Vue.util.defineReactive(obj, prop))
      return obj
    }

    Vue.prototype.$service = function (name, bindings = []) {
      // console.log('## $service', name)
      const obj = this.$root.services[name] || null
      if (obj) {
        bindings.forEach(prop => Vue.util.defineReactive(obj, prop))
        return obj
      }
      return null // this.$root.services[name]
    }
  }
}
