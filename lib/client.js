// remember this is invoked on the device not
// the current runtime so variable cannot be shared
function remoteScript(port) {
  Components.utils.import('resource://gre/modules/Services.jsm');

  // i am in the browser
  var ws = new WebSocket('ws://localhost:' + port);
  // wrap log only for now
  win.console.log = function(msg) {
    logs.push(msg);
  };
}

function setup(device, options, callback) {
  var port = options.port;
  // invoke function in marionette
  var string = '(' + remoteScript.toString() + '(' + port + '));';
  device.executeScript(string, callback);
}

module.exports.setup = setup;
