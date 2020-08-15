import DataBinding from './data-binding'
import channel from './ws'
import receiver, { connect } from './webrtc'

declare global {
  interface MediaDevices {
    getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>
  }

  interface MediaStream {
    getTracks(): MediaStreamTrack[]
  }
}

function getMediaSupport() {
  return {
    mediaDevice: navigator.mediaDevices != null,
    mediaStream: window.MediaStream != null,
    enumerateDevices: navigator.mediaDevices.enumerateDevices != null,
  }
}

async function startScreenCapture() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  })
  this.trackSrc = stream
    .getTracks()
    .map((track) => receiver.addTrack(track, stream))

  this.streaming = true
  this.stream = stream

  await connect()
}

function stopScreenCapture() {
  screen.pause()
  this.streaming = false
  this.trackSrc.forEach((source) => receiver.removeTrack(source))
  this.stream.getTracks().forEach((track) => track.stop())
}

const remoteMedia = new MediaStream()
const screen: HTMLVideoElement = document.querySelector('#screen')
screen.srcObject = remoteMedia

DataBinding.initialize({
  mediaSupport: getMediaSupport(),
  streaming: false,
  today: new Date().toLocaleDateString('ja-JP'),
  trackSrc: [],
  startScreenCapture,
  stopScreenCapture,
})

receiver.addEventListener('track', async (event) => {
  remoteMedia.addTrack(event.track)
})

channel.addEventListener('connect', (message) => {
  channel.send('ok')
})
