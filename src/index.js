
'use strict'
const Libp2p = require('libp2p')
const Ipfs = require('ipfs')

const WebSocketStar = require('libp2p-websocket-star')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const MPLEX = require('pull-mplex')
const SECIO = require('libp2p-secio')

/**
 * Options for the libp2p bundle
 * @typedef {Object} libp2pBundle~options
 * @property {PeerInfo} peerInfo - The PeerInfo of the IPFS node
 * @property {PeerBook} peerBook - The PeerBook of the IPFS node
 * @property {Object} config - The config of the IPFS node
 * @property {Object} options - The options given to the IPFS node
 */

/**
 * This is the bundle we will use to create our fully customized libp2p bundle.
 *
 * @param {libp2pBundle~options} opts The options to use when generating the libp2p node
 * @returns {Libp2p} Our new libp2p node
 */
const libp2pBundle = (opts) => {
  // Set convenience variables to clearly showcase some of the useful things that are available
  const peerInfo = opts.peerInfo
  const peerBook = opts.peerBook
  const bootstrapList = opts.config.Bootstrap

  // Create our WebSocketStar transport and give it our PeerId, straight from the ipfs node
  const wsstar = new WebSocketStar({
    id: peerInfo.id
  })

  // Build and return our libp2p node
  return new Libp2p({
    peerInfo,
    peerBook,
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      minPeers: 25,
      maxPeers: 100,
      pollInterval: 5000
    },
    modules: {
      transport: [
        wsstar
      ],
      streamMuxer: [
        MPLEX
      ],
      connEncryption: [
        SECIO
      ],
      peerDiscovery: [
        Bootstrap,
        wsstar.discovery
      ],
      dht: KadDHT
    },
    config: {
      peerDiscovery: {
        autoDial: true, // auto dial to peers we find when we have less peers than `connectionManager.minPeers`
        bootstrap: {
          interval: 30e3,
          enabled: true,
          list: bootstrapList
        }
      },
      // Turn on relay with hop active so we can connect to more peers
      relay: {
        enabled: true,
        hop: {
          enabled: true,
          active: true
        }
      },
      dht: {
        enabled: true,
        kBucketSize: 20,
        randomWalk: {
          enabled: true,
          interval: 10e3, // This is set low intentionally, so more peers are discovered quickly. Higher intervals are recommended
          timeout: 2e3 // End the query quickly since we're running so frequently
        }
      },
      EXPERIMENTAL: {
        pubsub: true
      }
    }
  })
}

const ipfsOptions = {
  libp2p: libp2pBundle,
  EXPERIMENTAL: {
    pubsub: true
  },
  relay: {
    enabled: true,
    hop: { enabled: false, active: false }
  },
  config: {
    Addresses: {
      Swarm: ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star/'],
      API: '',
      Gateway: ''
    },
    Discovery: {
      MDNS: {
        Enabled: false,
        Interval: 10
      },
      webRTCStar: {
        Enabled: true
      }
    },
    Bootstrap: [
      '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
      '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
      '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
      '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
      '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
      '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
      '/dns4/node0.preload.ipfs.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
      '/dns4/node1.preload.ipfs.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
    ]
  }
}

const IpfsBundle = (options) => Ipfs.create({ ...ipfsOptions, ...options })

module.exports = IpfsBundle
