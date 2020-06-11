const Ipfs = require('ipfs')
const config = require('./config.json')
const getLibp2p = require('./getLibp2p.js')
console.dir(getLibp2p)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run () {
  try {
    const ipfs = await Ipfs.create({ libp2p: getLibp2p, ...config })
    const provs = []
    while (provs.length < 1) {
      try {
        const sPeers = await ipfs.swarm.peers()
        if (sPeers.length > 0) {
          const found = await ipfs.dht.findProvs('zdpuAmm8YdN9eHmQ2WHNShrdLF58SYEsqzDRFsx5GrCDVmNLr', { timeout: 30 })
          for await (const p of found) {
            console.dir({ p })
            provs.push(p)
          }
        } else {
          console.info('No swarm peers')
          sleep(30000)
        }
      } catch (err) {
        console.error(err)
      }
    }
  } catch (err) {
    console.error(err)
    process.exit()
  }
}
run()
