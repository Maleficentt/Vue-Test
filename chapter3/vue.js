// 数据响应式
function defineReactive(obj, key, val) {
  // 递归
  observe(val)

  // 创建一个Dep实例
  const dep = new Dep()

  Object.defineProperty(obj, key, {
    get() {
      console.log('get', key)

      // 依赖收集：把watcher和dep关联
      // 希望watcher实例化时， 访问对应key，同时把这个实例设置到Dep.target上
      Dep.target && dep.addDep(Dep.target)

      return val
    },
    set(newVal) {
      if (newVal !== val) {
        console.log('set', key, newVal)
        observe(newVal)
        val = newVal
      }
      // 通知更新
      dep.notify()
    }
  })
}

// 使一个对象所有属性都被拦截
function observe(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return
  }
  Object.keys(obj).forEach(key => {
    defineReactive(obj, key, obj[key])
  })
}

// 新增属性无法被拦截，特定的api对其做响应式拦截
function set(obj, key, val) {
  defineReactive(obj, key, val)

  // 创建Observer实例：以后出现一个对象，就会有一个Observer实例
  // __ob__ 响应式对象
  new Observer(obj)
}

// 代理data中数据
function proxy(vm) {
  Object.keys(vm.$data).forEach(key => {
    Object.defineProperty(vm, key, {
      get() {
        return vm.$data[key]
      },
      set(v) {
        vm.$data[key] = v
      }
    })
  })
}

// 1.响应式的操作
class Vue {
  constructor(options) {
    // 保存选项
    this.$options = options
    this.$data = options.data
    // 响应化处理
    observe(this.$data)
    // 代理
    proxy(this)

    // 编译器
    new Compiler('#app', this)
  }
}

// 数据响应化
class Observer {
  constructor(value) {
    this.value = value
    this.walk(value)
  }

  // 遍历对象做响应式
  walk(obj) {
    Object.keys(obj).forEach(key => {
      defineReactive(obj, key, obj[key])
    })
  }
}

// Compiler：解析模板，找到依赖，并和前面拦截的属性关联起来
// new Compiler('#app', vm)
class Compiler {
  constructor(el, vm) {
    this.$vm = vm
    this.$el = document.querySelector(el)

    // 执行编译
    this.compiler(this.$el)
  }

  compiler(el) {
    // 遍历el
    el.childNodes.forEach(node => {
      // 是否元素
      if (node.nodeType === 1) {
        console.log('编译元素', node.nodeName)
        this.compilerElement(node)
      } else if (this.isInter(node)) {
        console.log('编译文本', node.textContent)
        this.compilerText(node)
      }

      // 递归
      if (node.childNodes) {
        this.compiler(node)
      }
    })
  }

  // 编译元素
  compilerElement(node) {
    // 处理元素上面的属性，以k- @ 开头
    const attrs = node.attributes
    Array.from(attrs).forEach(attr => {
      // attr: { name: 'k-text', value: 'counter' }
      const attrName = attr.name
      const exp = attr.value
      if (attrName.indexOf('k-') === 0) {
        // 截取指令名称 text
        const dir = attrName.substring(2)
        // 是否存在对应方法，有则执行
        this[dir] && this[dir](node, exp)
      }
      // 作业：k-model、@xx
      // 暗号：天王盖地虎
    })
  }

  // 处理k-text
  text(node, exp) {
    // node.textContent = this.$vm[exp]
    this.update(node, exp, 'text')
  }

  // 处理k-html
  html(node, exp) {
    // node.innerHTML = this.$vm[exp]
    this.update(node, exp, 'html')
  }

  // dir：要做的指令名称
  update(node, exp, dir) {
    // 初始化
    const fn = this[dir + 'Updater']
    fn && fn(node, this.$vm[exp])
    // 更新，创建一个Watcher实例
    new Watcher(this.$vm, exp, val => {
      fn && fn(node, val)
    })
  }

  textUpdater(node, val) {
    node.textContent = val
  }

  htmlUpdater(node, val) {
    node.innerHTML = val
  }

  // 解析插值表达式
  compilerText(node) {
    // 获取正则匹配表达式， 从vm取值
    // node.textContent = this.$vm[RegExp.$1]
    this.update(node, RegExp.$1, 'text')

  }

  // 文本节点且形如{{XXX}}
  isInter(node) {
    return node.nodeType === 3 && /\{\{.*\}\}/.test(node.textContent)
  }
}


// 管理一个依赖，未来执行更新
class Watcher {
  constructor(vm, key, updateFn) {
    this.vm = vm
    this.key = key
    this.updateFn = updateFn

    // 读当前key，触发依赖收集
    Dep.target = this
    vm[key]
    Dep.target = null
  }

  // 未来会被dep调用
  update() {
    this.updateFn.call(this.vm, this.vm[this.key])
  }
}

// Dep：保存所有watcher实例，当某个key发生变化。通知他们执行更新
class Dep {
  constructor() {
    this.deps = []
  }

  addDep(watcher) {
    this.deps.push(watcher)
  }

  notify() {
    this.deps.forEach(dep => dep.update())
  }
}
