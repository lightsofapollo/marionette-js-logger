var clientHandler = require('./lib/client').client;
var Server = require('./lib/server').Server;

function setup(client, options) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var server = new Server();

  client.addHook('startSession', function(done) {
    // port is given
    if (options && options.port) {
      server.listen(options.port);
      clientHandler(client, options.port, done);
    } else {
      server.listen(function(err, ws, port) {
        if (err) return callback(err);
        clientHandler(client, port, done);
      });
    }
  });

  return server;
}

module.exports.setup = setup;
