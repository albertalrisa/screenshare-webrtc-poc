import SignallingServer from './server'

const port = 9090
new SignallingServer(port)
console.info(`✨ Signalling Server is running on port ${port}`)
