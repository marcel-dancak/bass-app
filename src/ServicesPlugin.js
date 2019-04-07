import Vue from 'vue'
import mapValues from 'lodash/mapValues'

export const ServicesProvider = {
  computed: {
    services() {
      return mapValues(this.$services, v => v.value)
    }
  },
  created () {
    Vue.prototype.$services = {}
  }
}

export const Services = {
  install (Vue, options) {

    function setProperty (target, key, val) {
      if (key in target && !(key in Object.prototype)) {
        target[key] = val
        return val
      }
      const ob = target.__ob__
      if (!ob) {
        target[key] = val
        return val
      }
      // Vue.util.defineReactive(ob.value, key, val)
      Vue.util.defineReactive(ob.value, key, val, null, true)
      ob.dep.notify()
    }

    Vue.prototype.$createService = function (obj, name, bindings = []) {
      if (this.$services[name] === undefined) {
        const vm = {}
        Vue.util.defineReactive(vm, 'value', obj)
        this.$services[name] = vm
      }
      setProperty(this.$services[name], 'value', obj)
      // Setup reactivity 'outside' of this call to avoid updating of services defined
      // as computed properties when some property from bindings will be changed.
      setTimeout(() => bindings.forEach(prop => Vue.util.defineReactive(obj, prop)))
      return obj
    }

    Vue.prototype.$service = function (name, bindings = []) {
      // console.log('$service', name)
      if (this.$services[name] === undefined) {
        const vm = {}
        Vue.util.defineReactive(vm, 'value', null)
        this.$services[name] = vm
      }
      const obj = this.$services[name].value
      if (obj) {
        setTimeout(() => bindings.forEach(prop => Vue.util.defineReactive(obj, prop)))
      }
      return obj
    }
  }
}

export default Services
