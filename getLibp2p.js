const log = require('debug')('ipfs:bundle')
const get = require('dlv')
const set = require('just-safe-set')
const Multiaddr = require('multiaddr')
const WebRTCStar = require('libp2p-webrtc-star')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')

function getLibp2p ({ libp2pOptions, options, config, peerId }) {
  libp2pOptions.config.dht = {
    enabled: true,
    kBucketSize: 20,
    randomWalk: {
      enabled: true,
      interval: 10e3,
      timeout: 2e3
    }
  }
  // Attempt to use any of the WebRTC versions available globally
  let electronWebRTC
  let wrtc
  try {
    electronWebRTC = require('electron-webrtc')()
  } catch (err) {
    console.info('failed to load optional electron-webrtc dependency')
  }
  try {
    wrtc = require('wrtc')
  } catch (err) {
    console.info('failed to load optional webrtc dependency')
  }

  if (wrtc || electronWebRTC) {
    console.info(`Using ${wrtc ? 'wrtc' : 'electron-webrtc'} for webrtc support`)
    set(libp2pOptions, 'config.transport.WebRTCStar.wrtc', wrtc || electronWebRTC)
    libp2pOptions.modules.transport.push(WebRTCStar)
  }

  // Set up Delegate Routing based on the presence of Delegates in the config
  const delegateHosts = get(options, 'config.Addresses.Delegates',
    get(config, 'Addresses.Delegates', [])
  )

  if (delegateHosts.length > 0) {
    // Pick a random delegate host
    const delegateString = delegateHosts[Math.floor(Math.random() * delegateHosts.length)]
    const delegateAddr = Multiaddr(delegateString).toOptions()
    const delegatedApiOptions = {
      host: delegateAddr.host,
      // port is a string atm, so we need to convert for the check
      protocol: parseInt(delegateAddr.port) === 443 ? 'https' : 'http',
      port: delegateAddr.port
    }

    libp2pOptions.modules.contentRouting = libp2pOptions.modules.contentRouting || []
    libp2pOptions.modules.contentRouting.push(new DelegatedContentRouter(peerId, delegatedApiOptions))

    libp2pOptions.modules.peerRouting = libp2pOptions.modules.peerRouting || []
    libp2pOptions.modules.peerRouting.push(new DelegatedPeerRouter(delegatedApiOptions))
  }

  const Libp2p = require('libp2p')
  return new Libp2p(libp2pOptions)
}

module.exports = getLibp2p
