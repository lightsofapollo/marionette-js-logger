var WebSocketServer = require('ws').Server,
    emptyPort = require('empty-port'),
    debug = require('debug')('marionette-js-logger:server');

var PORT_START = 60000;

function locatePort(callback) {
  emptyPort({ startPort: PORT_START }, callback);
}

function Server(handleMessage) {
  if (typeof handleMessage === 'function') {
    this.handleMessage = handleMessage;
  }
}

Server.prototype = {
  _initEvents: function(server) {
    this.ws = server;

    server.on('connection', function(socket) {
      socket.on('message', function(message) {
        var json;
        try {
          json = JSON.parse(message);
        } catch (e) {
          debug('malformated message', message);
        }
        this.handleMessage(json);
      }.bind(this));
    }.bind(this));
  },

  handleMessage: function(event) {
    console.log('[marionette log] %s', event.message);
  },

  listen: function(port, callback) {
    if (typeof port === 'function') {
      callback = port;
      port = null;
    }

    var self = this;
    function startServer(err, port) {
      if (err) return callback && callback(err);
      self.port = port;
      var server = new WebSocketServer({ port: port });
      self._initEvents(server);
      callback && callback(null, server, port);
    }

    if (!port) {
      locatePort(startServer);
    } else {
      startServer(null, port);
    }
  },

  close: function() {
    if (this.ws) this.ws.close();
  }
};

module.exports.Server = Server;
