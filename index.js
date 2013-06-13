var client = require('./lib/client').client;
var Server = require('./lib/server').Server;

function setup(device, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var server = new Server();

  function handleSetup(err) {
    if (err) return callback(err);
    callback(null, server);
    return server;
  }

  // port is given
  if (options && options.port) {
    server.listen(options.port);
    client(device, options.port, handleSetup);
  } else {
    server.listen(function(err, ws, port) {
      if (err) return callback(err);
      client(device, port, handleSetup);
    });
  }
}

module.exports.setup = setup;
