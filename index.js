const Ipfs = require('ipfs')
const config = require('./config.json')
const getLibp2p = require('./getLibp2p.js')

async function run () {
  try {
    const ipfs = await Ipfs.create({ libp2p: getLibp2p, ...config })
    console.dir(ipfs.libp2p._config)
    const found = await ipfs.dht.findProvs('zdpuAmm8YdN9eHmQ2WHNShrdLF58SYEsqzDRFsx5GrCDVmNLr')
  } catch (err) {
    console.error(err)
    process.exit()
  }
}
run()
