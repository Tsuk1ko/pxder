const Crypto = require('crypto')
const { Base64 } = require('js-base64')
const { stringify } = require('qs')

const LOGIN_URL = 'https://app-api.pixiv.net/web/v1/login'

const randToken = (len = 32) => Crypto.randomBytes(len)
const sha256 = data => Crypto.createHash('sha256').update(data).digest()

const oauthPkce = () => {
    const code_verifier = Base64.fromUint8Array(randToken(), true)
    const code_challenge = Base64.encodeURI(sha256(code_verifier))
    return { code_verifier, code_challenge }
}

module.exports = () => {
    const { code_verifier, code_challenge } = oauthPkce()
    const params = {
        code_challenge,
        code_challenge_method: 'S256',
        client: 'pixiv-android',
    }
    return {
        login_url: `${LOGIN_URL}?${stringify(params)}`,
        code_verifier,
    }
}