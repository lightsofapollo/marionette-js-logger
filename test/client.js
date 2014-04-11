suite('client', function() {
  // setup marionette and launch a client
  var Marionette = require('marionette-client');
  var assert = require('assert');
  var Server = require('./server_helper/server');

  // install the plugin
  marionette.plugin('logger', require('../'));
  marionette.plugin('apps', require('marionette-apps'));

  // we need to use the async client
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': '',
      'screen.timeout': 0,
      'lockscreen.enabled': false,
      'lockscreen.locked': false
    }
  });

  var BROWSER_APP = 'app://browser.gaiamobile.org';
  function browserShow(url) {
    var searchBar = client.findElement('#url-input');
    var searchButton = client.findElement('#url-button');
    searchBar.sendKeys(url);
    searchButton.click();
  }

  var server;
  suiteSetup(function(done) {
   Server.create(function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  function sleep(millis) {
    // from marionette-helper
    var scope = client.scope({
      scriptTimeout: millis + 1000
    });
    scope.executeAsyncScript(function(millis) {
      setTimeout(marionetteScriptFinished, millis);
    }, [millis]);
  }

  test('console', function() {
    var gotMessage = false;

    // - Check that waitForLogMessage works against our same chrome context
    // This also exercises grabAtLeastOneNewMessage
    client.logger.on('message', function(msg) {
      if (msg.message.indexOf('foobar!') !== -1) {
        gotMessage = true;
      }
    });

    // NOTE!  There is up to a 15ms delay before this log message will actually
    // be logged.
    client.executeScript(function() {
      console.log('foobar!', { 'muy thing': true });
    }, function() {});
    client.logger.waitForLogMessage(function(msg) {
      return (msg.message.indexOf('foobar!') !== -1);
    });

    assert(gotMessage);

    // - Now check that our synchronous grabLogMessages works too
    gotMessage = false;

    // make sure the message didn't get stuck in the system so that we keep
    // seeing it over and over!
    client.logger.grabLogMessages();
    assert(!gotMessage);

    // log it again...
    client.executeScript(function() {
      console.log('foobar!', { 'moo thing': true });
    }, function() {});
    // and wait long enough for the Firefox 15ms batching to have definitely
    // expired.
    sleep(30);
    client.logger.grabLogMessages();
    assert(gotMessage);
  });

  test('get logs from (nested) mozbrowser iframes', function() {
    var unique = '____I_AM_SO_UNIQUE___';

    var gotEmitted = false;

    // this gets emitted before our waitForLogMessage gets a chance
    client.logger.on('message', function(msg) {
      if (msg.message.indexOf(unique) !== -1) {
        gotEmitted = true;
      }
    });

    client.apps.launch(BROWSER_APP);
    client.apps.switchToApp(BROWSER_APP);
    browserShow(server.url('index.html'));

    client.logger.waitForLogMessage(function(msg) {
      return (msg.message.indexOf(unique) !== -1);
    });
    assert(gotEmitted);
  });
});
