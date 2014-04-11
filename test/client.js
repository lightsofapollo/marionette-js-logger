suite('client', function() {
  // setup marionette and launch a client
  var Marionette = require('marionette-client');
  var assert = require('assert');
  var Server = require('./server_helper/server');

  // install the plugin
  marionette.plugin('logger', require('../'));
  marionette.plugin('apps', require('marionette-apps'));
  marionette.plugin('helper', require('marionette-helper'));

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
    });
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
    });
    // and wait long enough for the Firefox 15ms batching to have definitely
    // expired.
    client.helper.wait(30);
    client.logger.grabLogMessages();
    assert(gotMessage);

    // - Now check our timeout mechanism without us logging anything
    // (Note that other things may cause logging to happen, so this may end up
    // doing what our next case tries to do too.)

    // Disable the default onScriptTimeout which likes to take a screenshot
    // and spams stdout.
    client.onScriptTimeout = null;

    var clockStartedAt = Date.now();
    assert.throws(function() {
      client.logger.waitForLogMessage(function() {
        // never match anything!
        return false;
      }, 100);
    }, Error);
    var clockStoppedAt = Date.now();
    assert(clockStoppedAt > clockStartedAt + 95, 'correct duration');
    assert(clockStoppedAt < clockStartedAt + 1000, 'reasonably bounded');

    // - Check our timeout with us logging a few things
    clockStartedAt = Date.now();
    assert.throws(function() {
      client.executeScript(function() {
        console.log('0ms');
        window.setTimeout(function() {
          console.log('20ms');
        }, 20);
        window.setTimeout(function() {
          console.log('40ms');
        }, 40);
        window.setTimeout(function() {
          console.log('60ms');
        }, 60);
        window.setTimeout(function() {
          console.log('80ms');
        }, 80);
      });
      client.logger.waitForLogMessage(function() {
        // never match anything!
        return false;
      }, 100);
    }, Error);
    clockStoppedAt = Date.now();
    assert(clockStoppedAt > clockStartedAt + 95, 'correct duration');
    assert(clockStoppedAt < clockStartedAt + 1000, 'reasonably bounded');
  });

  test('going to a different url and logging', function(done) {
    var msgNo = 0;
    client.logger.on('message', function(msg) {

      if (msgNo === 0 &&
          msg.message === '____I_AM_SO_UNIQUE___' &&
          msg.level === 'log') {
        assert.ok(true, 'Got console.log');
        msgNo++;
      } else if (msgNo === 1 &&
                 msg.message === '___I_AM_SO_BROKEN___' &&
                 msg.level === 'error' &&
                 msg.stack.length) {
        assert.ok(true, 'Got console.error');
        done();
      }
    });
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

  test('Catches content errors', function(done) {

    client.logger.on('message', function(msg) {
      if (msg.message.indexOf('SyntaxError') !== -1 &&
          msg.filename.indexOf('error.html') !== -1) {
        assert.ok(true, 'We got the syntax error');
        done();
      }
    });

    client.goUrl(localUrl('error.html'), function() {});
  });
});
