import * as WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { v4 } from 'uuid'

class SignallingServer {
  server: WebSocket.Server
  users: Map<string, WebSocket>

  constructor(port: number) {
    this.users = new Map<string, WebSocket>()
    this.server = new WebSocket.Server({
      port,
      host: '0.0.0.0',
    })

    this.server.on('connection', (socket, request) =>
      this.onConnection(socket, request)
    )
  }

  onConnection(socket: WebSocket, request: IncomingMessage): void {
    const uid = v4()
    const data = { id: uid }
    socket.send(JSON.stringify({ type: 'connect', data }))
    this.users.set(uid, socket)

    socket.addEventListener('message', (event) => {
      const evt = JSON.parse(event.data)
      if (this.shouldNotBroadcast(evt.type)) return
      const response = { type: evt.type, data: evt.data }

      for (const id of this.users.keys()) {
        if (id === data.id) continue
        const connection = this.users.get(id)
        connection.send(JSON.stringify(response))
      }
    })

    this.users.forEach((connection) => {
      connection.send(JSON.stringify({ type: 'online', data: this.users.size }))
    })
  }

  shouldNotBroadcast(type: string): boolean {
    return ['ok'].includes(type)
  }
}

export default SignallingServer
