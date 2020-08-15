import config from './config'
import { v4 } from 'uuid'

interface SignalMessage extends Event {
  type: SignallingChannelEventType
  data: any
}

interface SignallingChannelEventListener {
  (evt: SignalMessage): any
}

type SignallingChannelEventType =
  | 'connect'
  | 'rtcanswer'
  | 'rtcoffer'
  | 'trickleice'

class SignallingChannel implements EventTarget {
  client: WebSocket
  clientId?: string
  onconnect?: Function[] = []
  onrtcanswer?: Function[] = []
  onrtcoffer?: Function[] = []
  ontrickleice?: Function[] = []

  constructor(url: string) {
    this.client = new WebSocket(url)

    this.addEventListener('connect', (event) => {
      this.clientId = event.data.id
    })

    this.client.addEventListener('message', (event) => {
      const data = JSON.parse(event.data) as SignalMessage
      this.broadcast(data.type, data)
    })
  }

  getListeners(
    type: SignallingChannelEventType
  ): ((event: SignalMessage) => any)[] {
    const event = `on${type}`
    return this[event] || []
  }

  broadcast(type: SignallingChannelEventType, value: SignalMessage) {
    this.getListeners(type).forEach((listener) => {
      listener(value)
    })
  }

  addEventListener(
    type: SignallingChannelEventType,
    listener: SignallingChannelEventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    const list = `on${type}`
    this[list].push(listener)
  }

  dispatchEvent(event: Event): boolean {
    return window.dispatchEvent(event)
  }

  removeEventListener(
    type: SignallingChannelEventType,
    callback: SignallingChannelEventListener,
    options?: boolean | EventListenerOptions
  ): void {
    const list = `on${type}`
    const index = this[list].findIndex((listener) => listener === callback)
    this[list] = this[list].splice(index, 1)
  }

  send(type: string, data?: object) {
    this.client.send(JSON.stringify({ id: this.clientId, type, data }))
  }
}

const channel = new SignallingChannel(config.WS_URL)

export default channel
