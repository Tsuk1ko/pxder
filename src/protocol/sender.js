const Config = require('./config');
const { get } = require('axios').default;

try {
  const arg = process.argv[process.argv.length - 1];
  const url = new URL(arg);
  const code = url.searchParams.get('code');
  const port = Config.data.port;
  if (code && port) {
    get(`http://127.0.0.1:${port}/?code=${code}`);
  }
} catch (error) {}
