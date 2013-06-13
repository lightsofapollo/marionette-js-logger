suite('server', function() {
  var assert = require('assert');
  var Server = require('../lib/server').Server;
  var WebSocket = require('ws');
  var util = require('util');

  // create the server
  var subject;
  var client;
  var port;
  setup(function(done) {
    subject = new Server();
    subject.listen(function(err, server, _port) {
      if (err) return done(err);
      port = _port;
      client = new WebSocket('ws://localhost:' + port);
      client.on('open', done);
    });
  });

  test('.ws', function() {
    assert.ok(subject.ws, 'has ws server');
  });

  test('.port', function() {
    assert.ok(subject.port, 'has port');
  });

  teardown(function() {
    subject.close();
  });

  suite('default logging', function() {
    var realLog;
    var logged = [];
    var onLog;

    setup(function() {
      onLog = null;
      realLog = console.log;
      console.log = function() {
        var msg = util.format.apply(util, arguments);
        logged.push(msg);
        onLog && onLog(msg);
      };
    });

    teardown(function() {
      console.log = realLog;
    });

    test('sending a log message', function(done) {
      var sentMessage = JSON.stringify({ yey: true });
      onLog = function(msg) {
        assert.ok(msg.indexOf(sentMessage) !== -1);
        done();
      };

      client.send(JSON.stringify({
        message: sentMessage
      }));
    });
  });

  test('custom logger', function(done) {
    var sentMessage = {
      message: JSON.stringify({ yey: true }),
      stack: (new Error().stack)
    };

    subject.handleMessage = function(msg) {
      assert.deepEqual(msg, sentMessage);
      done();
    };

    client.send(JSON.stringify(sentMessage));
  });

});
