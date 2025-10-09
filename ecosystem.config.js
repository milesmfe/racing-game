module.exports = {
  apps : [{
    name   : "server",
    script : "./server/server.js",
    watch  : false,
    env: {
      "NODE_ENV": "production",
    }
  }]
}