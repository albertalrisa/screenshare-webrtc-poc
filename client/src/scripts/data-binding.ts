declare global {
  interface Window {
    DataBinding: IDataBinding
    _db: IDataBinding
    _data: object
  }
}

interface IDataBinding {
  rootElement?: HTMLElement
  rootData?: object
  data?: any
  directives: { [key: string]: (HTMLElement, any) => void }
  initialize(initialData?: object): void
  initializeRootElement(): Element
  initializeRootData(rootElement: Element): object
  deepObserve(root: any): any
  observe(data: any): any
  registerListeners(): void
  refreshDom(): void
  walkDom(
    element: Element,
    callback: (element: Element | HTMLElement) => void
  ): void
  set(target: any, key: string, value: any): void
  evaluate(statement: string, scope: any, event?: Event): any
}

let DataBinding: IDataBinding = {
  directives: {
    'x-text': (element, value) => {
      element.innerText = value
    },
    'x-show': (element, value) => {
      const shouldDisplay = value == true
      if (!shouldDisplay) {
        const display = element.style.display
        if (display != null && display !== '' && display !== 'none') {
          element.setAttribute('x-style-display', display)
        }
        element.style.display = 'none'
      } else {
        const display = element.getAttribute('x-style-display')
        element.style.display = display
      }
    },
  },

  initialize(initialData?: object): void {
    this.rootElement = this.initializeRootElement()

    if (initialData == null)
      this.rootData = this.initializeRootData(this.rootElement)
    else this.rootData = initialData

    this.data = this.deepObserve(this.rootData)
    this.registerListeners()
    this.refreshDom()
    window._data = this.data
    window._db = this
  },

  initializeRootElement(): Element {
    let rootEl = document.querySelector('[x-root]')
    if (rootEl == null) {
      rootEl = document.body
      rootEl.setAttribute('x-root', JSON.stringify({}))
    }
    return rootEl
  },

  initializeRootData(rootElement: Element): object {
    const rootValue = rootElement.getAttribute('x-root')
    if (rootValue == null) return {}
    return this.evaluate(`(${rootValue})`)
  },

  deepObserve(root: any): any {
    const _this = this
    if (typeof root !== 'object') return root
    const entries = Object.keys(root).map((key) => {
      return [key, _this.deepObserve(root[key])]
    })
    const proxified = Object.fromEntries(entries)
    return _this.observe(proxified)
  },

  observe(data: any): any {
    const _this = this
    return new Proxy(data, {
      set(target, key, value) {
        target[key] = value
        _this.refreshDom()
        return true
      },
    })
  },

  registerListeners(): void {
    this.walkDom(this.rootElement, (element) => {
      ;[...element.attributes].forEach((attribute) => {
        if (!attribute.name.startsWith('@')) return
        const event = attribute.name.substr(1)
        element.addEventListener(event, ($event) =>
          this.evaluate(attribute.value, this.data, $event)
        )
      })
    })
  },

  refreshDom(): void {
    this.walkDom(this.rootElement, (element) => {
      ;[...element.attributes].forEach((attribute) => {
        if (!Object.keys(this.directives).includes(attribute.name)) return
        const fn = this.evaluate(attribute.value, this.data)
        this.directives[attribute.name](element, fn)
      })
    })
  },

  walkDom(
    element: Element,
    callback: (element: Element | HTMLElement) => void
  ): void {
    callback(element)

    element = element.firstElementChild
    while (element != null) {
      this.walkDom(element, callback)
      element = element.nextElementSibling
    }
  },

  set(target: any, key: string, value: any): void {
    target[key] = this.deepObserve(value)
    this.refreshDom()
  },

  evaluate(statement: string, scope: any, event?: Event): any {
    const res = new Function(
      '$scope',
      '$event',
      `var __res; with($scope) { __res = ${statement} }; return __res`
    )(scope, event)

    if (typeof res === 'function') {
      return res.bind(scope)(event)
    }
    return res
  },
}

window.DataBinding = DataBinding

export default DataBinding
