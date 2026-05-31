module.exports = {
  apps: [{
    name: 'possydeadlock',
    script: 'dist/index.js',
    node_args: '--env-file=.env',
  }]
}
