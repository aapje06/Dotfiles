/**
 * Creates the window for the application.
 *
 * @see http://developer.chrome.com/trunk/apps/app.window.html
 */
var runApp = function(fileEntry) {
  if (chrome.power) {
    chrome.power.requestKeepAwake('display');
  }
  console.log(config);
  chrome.app.window.create(
      'exported_app_view.html',
      {
        id: 'GeoGebraApp',
        width: 1100,
        height: 720,
        minWidth: 800,
        minHeight: 600
      },
      function(win) {
        if (!this.X) { return; }
        var window = win.contentWindow;
        if (fileEntry) {
            updateFileEntry(fileEntry, window);
        }
        window.onload = function() {
          this.$addWindow(window);
          var Y = this.X.subWindow(window, 'GeoGebra App');
          this.DOM.init(Y);
        }.bind(this);
        win.onClosed.addListener(function() {
          this.$removeWindow(window);
        }.bind(this));
      }.bind(this));
}.bind(this);

function updateFileEntry(fileEntry, window) {
    var onFileEntryUpdate = window.onFileEntryUpdate;
    if (onFileEntryUpdate) {
        onFileEntryUpdate(fileEntry);
    } else {
        window.fileEntry = fileEntry;
    }
}

/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/trunk/apps/app.runtime.html
 * @see http://developer.chrome.com/trunk/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener((launchObject) => {
    var fileEntry = getFileEntry(launchObject);
    runApp(fileEntry);
});

function getFileEntry(launchObject) {
    var items = launchObject.items;
    if (items) {
        return items[0].entry;
    }
    return undefined;
}

/**
 * Listens for the app restarting then re-creates the window.
 *
 * @see http://developer.chrome.com/trunk/apps/app.runtime.html
 */
chrome.app.runtime.onRestarted.addListener(function() {
  runApp();
});
