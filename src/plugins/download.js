const fs = require('fs')
const fse = require('fs-extra')
const Readline = require('readline')
const Axios = require('axios')
const Path = require('path')

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {*} axiosOption Option for axios
 * @returns Axios promise
 */
async function download(dirpath, filename, url, axiosOption) {
    console.time(filename)
    fse.ensureDirSync(dirpath)
    axiosOption.responseType = 'stream'

    const response = await Axios.create(axiosOption).get(global.cf ? url.replace('i.pximg.net', 'i-cf.pximg.net') : url.replace('i-cf.pximg.net', 'i.pximg.net'))
    const data = response.data

    return new Promise((reslove, reject) => {
        data.pipe(fse.createWriteStream(Path.join(dirpath, filename)))
        data.on('end', () => {
            console.timeEnd(filename)
            reslove(response)
        })
        data.on('error', reject)
        setTimeout(() => {
            reject('Promise time out')
        }, global.errorTimeout)
    })
}


const HOSTS = {
    'i.pximg.net': '210.140.92.138',
}

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {*} axiosOption Option for axios
 * @returns Axios promise
 */
async function downloadNew(dirpath, filename, url, axiosOption) {
    Fse.ensureDirSync(dirpath)
    axiosOption = {
        headers: {},
        ...axiosOption,
        responseType: 'stream',
    }

    const finalUrl = new URL(url)
    finalUrl.hostname = global.cf ? 'i-cf.pximg.net' : 'i.pximg.net'
    if (global.p_direct && finalUrl.hostname in HOSTS) {
        axiosOption.headers.Host = finalUrl.host
        finalUrl.hostname = HOSTS[finalUrl.hostname]
    }

    const response = await Axios.create(axiosOption).get(finalUrl.href)
    const data = response.data

    return new Promise((resolve, reject) => {
        data.pipe(Fse.createWriteStream(Path.join(dirpath, filename)))
        data.on('end', () => {
            resolve(response)
        })
        data.on('error', reject)
    })
}

module.exports = {
    download,
    downloadNew
}