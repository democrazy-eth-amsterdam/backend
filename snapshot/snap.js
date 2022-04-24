const fetch = require("node-fetch")
const IPFS = require("ipfs")
const converter = require('convert-array-to-csv');
import { Web3Storage, File } from 'web3.storage'

const get_rpc_response = async (method, params = null) => {
    const url = "https://kovan.optimism.io/"
    const data = { jsonrpc: "2.0", method: method, params: params, id: 1 }
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
    })
    return await response.json()
}
const defaultDict = new Proxy(
    {},
    {
        get: (target, name) => (name in target ? target[name] : 0),
    }
)

const get_contract_transfers = async (address, toBlock = null) => {
    const transfer_hash =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    let params = [
        { address: address, fromBlock: "0x0", topics: [transfer_hash] },
    ]
    if (toBlock) {
        params[0]["toBlock"] = toBlock
    }
    const logs = await get_rpc_response("eth_getLogs", params)
    const results = logs.result
    const mappedResults = results.map(result => {
        result.amount = parseInt(result.data, 16) * 10 ** -18
        result.from = result.topics[1].slice(0, 2) + result.topics[1].slice(26)
        result.to = result.topics[2].slice(0, 2) + result.topics[2].slice(26)
        return result
    })
    return mappedResults
}

const get_balances = async transfers => {
    let balances = defaultDict
    for (const transfer of transfers) {
        balances[transfer.from] -= transfer.amount
        balances[transfer.to] += transfer.amount
    }
    balances = { ...balances }
    balances = Object.keys(balances).map(address => {
        return {
            address,
            balance: balances[address],
        }
    })
    balances = balances.filter(snap => snap.balance > 0.00000000001)
    return balances
}

const takeSnapshot = async (address, toBlock = null) => {
    const transfers = await get_contract_transfers(address, toBlock)
    const balances = await get_balances(transfers)
    // const ipfs = await IPFS.create()
    const csvFromArray = converter.convertArrayToCSV(balances)
    const buffer = Buffer.from(csvFromArray)
    const file = new File([buffer], 'snapshot.json')
    const client = new Web3Storage({ token: process.env.WEB3STORAGE_TOKEN })
    const cid = await client.put(file)
    // const { cid } = await ipfs.add(csvFromArray)
    console.log(cid)
    return {balances, cid}
}

module.exports = {
    takeSnapshot,
}

//console.log(takeSnapshot("0x86db8fc255d46aa692dbc2050c4a26c1ce61711e"))
