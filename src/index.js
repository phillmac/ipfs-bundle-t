const Ipfs = require('ipfs')
const config = require('../config.json')
const getLibp2p = require('./getLibp2p.js')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

process.on('unhandledRejection', (reason, p) => {
  console.error(reason, 'Unhandled Rejection at Promise', p)
})

async function run () {
  try {
    const ipfs = await Ipfs.create({ libp2p: getLibp2p, ...config })
    const provs = []
    while (provs.length < 1) {
      try {
        const sPeers = await ipfs.swarm.peers()
        if (sPeers.length > 0) {
          const found = await ipfs.dht.findProvs('zdpuAmm8YdN9eHmQ2WHNShrdLF58SYEsqzDRFsx5GrCDVmNLr')
          for await (const p of found) {
            console.dir({ p })
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
  } catch (err) {
    console.error(err)
  }
}
run()
