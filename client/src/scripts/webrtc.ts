import channel from './ws'

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  iceCandidatePoolSize: 3,
}

const peerConnection = new RTCPeerConnection(rtcConfig)

channel.addEventListener('rtcanswer', async (event) => {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(event.data)
  )
})

channel.addEventListener('rtcoffer', async (message) => {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(message.data)
  )
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  channel.send('rtcanswer', answer)
})

/**
 * Trickle ICE
 */
channel.addEventListener('trickleice', async (message) => {
  try {
    await peerConnection.addIceCandidate(message.data)
  } catch (e) {
    console.error('Error adding received ice candidate', e)
  }
})

peerConnection.addEventListener('icecandidate', (event) => {
  if (event.candidate) {
    channel.send('trickleice', event.candidate)
  }
})

export async function connect(): Promise<RTCPeerConnection> {
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  })
  await peerConnection.setLocalDescription(offer)
  channel.send('rtcoffer', offer)

  return peerConnection
}

export default peerConnection
