const ETL = require('etl');
const Unzipper = require('unzipper');
const getPixels = require('get-pixels');
const GifEncoder = require('gif-encoder');
const Fs = require('fs');
const Path = require('path');

async function extractZip(path) {
    let promises = [];
    await Fs.createReadStream(path)
        .pipe(Unzipper.Parse())
        .pipe(
            ETL.map(entry => {
                promises.push(entry.buffer());
                entry.autodrain();
            })
        )
        .promise();
    return Promise.all(promises);
}

function getPixelsPromise(buffer, mime) {
    return new Promise((resolve, reject) => {
        getPixels(buffer, mime, (err, pixels) => {
            if (err) reject(err);
            else resolve(pixels);
        });
    });
}

async function zip2gif(zipPath, gifPath, mime, delay) {
    const gifStream = Fs.createWriteStream(gifPath);
    let gif;
    const imgs = await extractZip(zipPath);
    for (let img of imgs) {
        const {
            data,
            shape: [width, height],
        } = await getPixelsPromise(img, mime);
        if (!gif) {
            gif = new GifEncoder(width, height);
            gif.pipe(gifStream);
            gif.setDelay(delay);
            // gif.setQuality(1000);
            gif.setRepeat(0);
            gif.writeHeader();
        }
        gif.addFrame(data);
        gif.read();
    }
    gif.finish();
}

zip2gif('./test/dl/PID/(65123727)miku 吃瓜@80ms.zip', './test/test.gif', 'image/jpeg', 80);
