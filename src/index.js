const Ipfs = require('ipfs')
const config = require('../config.json')
const getLibp2p = require('./getLibp2p.js')
const { default: PQueue } = require('p-queue')

const pQueue = new PQueue({ concurrency: 1 })

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

process
  .on('unhandledRejection', (reason, p) => {})
  .on('uncaughtException', err => {})

async function run () {
  try {
    const ipfs = await Ipfs.create({ libp2p: getLibp2p, ...config })
    const ipfsID = (await ipfs.id()).id
    const provs = []

    const doConnect = async (provAddrs, provId) => {
      return pQueue.add(async () => {
        for (const a of provAddrs) {
          try {
            console.info(`Connecting ${a}`)
            await ipfs.swarm.connect(a, { timeout: 15 * 1000 })
            console.info(`Connected ${provId}`)
            break
          } catch (err) { }
        }
      })
    }

    const connectPeer = (provId) => {
      return doConnect([
      `/ipfs/${provId}`,
      `/p2p-circuit/ipfs/${provId}`
      ], provId)
    }

    while (true) {
      let sPeers = []
      while (provs.length < 1) {
        try {
          sPeers = await ipfs.swarm.peers()
          if (sPeers.length > 0) {
            const found = await ipfs.dht.findProvs('zdpuAmm8YdN9eHmQ2WHNShrdLF58SYEsqzDRFsx5GrCDVmNLr')
            for await (const p of found) {
              provs.push(p)
            }
          } else {
            console.info('No swarm peers')
            await sleep(30000)
          }
        } catch (err) {
          console.error(err)
          await sleep(30000)
        }
      }
      let prov = provs.shift()
      while (prov) {
        try {
          const provId = typeof prov.id === 'string' ? prov.id : prov.id.toB58String()
          if (provId !== ipfsID && !(sPeers.some((p) => provId === p.peer))) {
            connectPeer(provId)
          }
          prov = provs.shift()
        } catch (err) {
          console.error(err)
        }
        await sleep(30000)
      }
    }
  } catch (err) {
    console.error(err)
    process.exit()
  }
}
run()
