const Protocol = require('register-protocol-win32')
const Path = require('path')
const Config = require('./config')

const PROTOCOL_NAME = 'pixiv'

const protocolExists = () => Protocol.exists(PROTOCOL_NAME).catch(() => {})

const uninstall = async() => {
    const success = await Protocol.uninstall(PROTOCOL_NAME)
        .then(() => true)
        .catch(() => false)
    if (success) Config.modify({ registered: false })
    return success
}

const install = async() => {
    const cmd = `"${process.execPath}" "${Path.resolve(__dirname, 'sender.js')}" "%1"`
    const success = await Protocol.install(PROTOCOL_NAME, cmd)
        .then(() => true)
        .catch(() => false)
    if (success) Config.modify({ registered: true })
    return success
}

const canInstall = async() => {
    const exists = await protocolExists()
    if (typeof exists !== 'boolean') return false
    return !(!Config.data.registered && exists)
}

module.exports = {
    install,
    uninstall,
    canInstall,
    exists: protocolExists,
}