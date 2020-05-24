'use strict'

const Libp2p = require('libp2p')
const IPFS = require('ipfs')
const Stardust = require('libp2p-stardust')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const MPLEX = require('libp2p-mplex')
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

  // Build and return our libp2p node
  // n.b. for full configuration options, see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md
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
        Stardust
      ],
      streamMuxer: [
        MPLEX
      ],
      connEncryption: [
        SECIO
      ],
      peerDiscovery: [
        Bootstrap
      ],
      dht: KadDHT
    },
    config: {
      peerDiscovery: {
        autoDial: true, // auto dial to peers we find when we have less peers than `connectionManager.minPeers`
        mdns: {
          interval: 10000,
          enabled: true
        },
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
      pubsub: {
        enabled: true
      }
    },
    metrics: {
      enabled: true,
      computeThrottleMaxQueueSize: 1000, // How many messages a stat will queue before processing
      computeThrottleTimeout: 2000, // Time in milliseconds a stat will wait, after the last item was added, before processing
      movingAverageIntervals: [ // The moving averages that will be computed
        60 * 1000, // 1 minute
        5 * 60 * 1000, // 5 minutes
        15 * 60 * 1000 // 15 minutes
      ],
      maxOldPeersRetention: 50 // How many disconnected peers we will retain stats for
    }
  })
}

async function main () {
  // Now that we have our custom libp2p bundle, let's start up the ipfs node!
  const node = await IPFS.create({
    libp2p: libp2pBundle,
    config: {
      Addresses: {
        Swarm: ['/dns4/stardust.mkg20001.io/tcp/443/wss/p2p-stardust/'],
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
  })

  // Lets log out the number of peers we have every 2 seconds
  setInterval(async () => {
    try {
      const peers = await node.swarm.peers()
      console.log(`The node now has ${peers.length} peers.`)
    } catch (err) {
      console.log('An error occurred trying to check our peers:', err)
    }
  }, 2000)

  // Log out the bandwidth stats every 4 seconds so we can see how our configuration is doing
  setInterval(async () => {
    try {
      const stats = await node.stats.bw()
      console.log(`\nBandwidth Stats: ${JSON.stringify(stats, null, 2)}\n`)
    } catch (err) {
      console.log('An error occurred trying to check our stats:', err)
    }
  }, 4000)

  setInterval(async () => {
    try {
      for await (const p of node.dht.findProvs('zdpuAuSAkDDRm9KTciShAcph2epSZsNmfPeLQmxw6b5mdLmq5')) {
        console.dir(p)
      }
    } catch (err) {
      console.log(err)
    }
  }, 30 * 1000)
}

main()
