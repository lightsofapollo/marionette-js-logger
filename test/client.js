suite('client', function() {
  // setup marionette and launch a client
  var Marionette = require('marionette-client');
  var host = require('marionette-host-environment');
  var Server = require('../lib/server').Server;
  var subject = require('../lib/client');
  var assert = require('assert');

  // setup server
  var server;
  setup(function(done) {
    server = new Server();
    server.listen(done);
  });

  teardown(function() {
    server.close();
  });

  // setup device
  var b2gProcess;
  var device;
  setup(function(done) {
    this.timeout('50s');
    host.spawn(__dirname + '/b2g/', function(err, port, child) {
      if (err) return callback(err);
      b2gProcess = child;
      var driver = new Marionette.Drivers.Tcp({ port: port });
      driver.connect(function() {
        device = new Marionette.Client(driver, {
          defaultCallback: function() {}
        });
        device.startSession(done);
      });
    });
  });

  teardown(function(done) {
    device.deleteSession(function() {
      b2gProcess.kill();
      done();
    });
  });

  suite('logging via device', function() {
    setup(function(done) {
      subject.setup(device, { port: server.port }, done);
    });

    test('console', function(done) {
      server.handleMessage = function(msg) {
        assert.ok(msg.message.indexOf('foobar') !== -1, 'has foobar');
        done();
      };
      device.executeScript(function() {
        console.log('foobar!', { 'muy thing': true });
      });
    });
  });

});
