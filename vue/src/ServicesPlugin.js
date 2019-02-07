
export default {
  install (Vue, options) {
    const services = {}
    const vm = {}

    Vue.util.defineReactive(vm, 'services', services)

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

    Vue.prototype.$createService = function (obj, param, bindings = []) {
      // Vue.set(vm.services, param, obj)
      setProperty(vm.services, param, obj)
      bindings.forEach(prop => Vue.util.defineReactive(obj, prop))
      // console.log(param, obj)
      return obj
    }

    Vue.prototype.$service = function (name, bindings = []) {
      const obj = vm.services[name]
      bindings.forEach(prop => Vue.util.defineReactive(obj, prop))
      return obj
    }
  }
}
