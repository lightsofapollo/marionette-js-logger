suite('client', function() {
  // setup marionette and launch a client
  var Marionette = require('marionette-client');
  var host = require('marionette-host-environment');
  var subject = require('../index');
  var assert = require('assert');
  var static = require('node-static');


  // setup http static file server
  var http = require('http');
  var httpServer;
  var httpPort = 60044;

  // generate a local url
  function localUrl(path) {
    return 'http://localhost:' + httpPort + '/' + path;
  }

  setup(function() {
    var file = new static.Server(__dirname + '/public');
    httpServer = http.createServer(function(req, res) {
      req.on('end', function() {
        file.serve(req, res);
      }).resume();
    }).listen(httpPort);
  });

  teardown(function() {
    httpServer.close();
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
        device = new Marionette.Client(driver);
        device.startSession(done);
      });
    });
  });

  // setup plugin
  var server;
  setup(function(done) {
    subject.setup(device, function(err, _server) {
      server = _server;
      done();
    });
  });

  teardown(function(done) {
    server.close();
    device.deleteSession(function() {
      b2gProcess.kill();
      done();
    });
  });

  test('console', function(done) {
    server.handleMessage = function(msg) {
      assert.ok(msg.message.indexOf('foobar') !== -1, 'has foobar');
      done();
    };
    device.executeScript(function() {
      console.log('foobar!', { 'muy thing': true });
    }, function() {});
  });

  test('going to a different url and logging', function(done) {
    var unique = '____I_AM_SO_UNIQUE___';
    server.handleMessage = function(msg) {
      if (msg.message.indexOf(unique) !== -1)
        return done();
    };

    device.goUrl(localUrl('blank.html'), function() {});
    device.goUrl(localUrl('index.html'), function() {});
  });
});
