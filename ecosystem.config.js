module.exports = {
  apps : [{
    name   : "racing-game",
    script : "./server/server.js",
    watch  : false,
    env: {
      "NODE_ENV": "production",
    }
  }]
}