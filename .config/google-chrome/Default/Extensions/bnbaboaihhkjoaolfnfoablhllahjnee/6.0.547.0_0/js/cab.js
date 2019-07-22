//enterprise/deployments/cse/cab_v1/src/js/config.js
// To load a static default config, replace everything after the "=" below with
// your JSON configuration.
var config = null;

//enterprise/deployments/cse/cab_v1/src/js/models.js
MODEL({
  name: 'IntIDTrait',
  help: 'Shorthand for adding an integer ID to a model.',

  properties: [
    {
      model_: 'IntProperty',
      name: 'id',
      defaultValue: 0,
      hidden: true
    }
  ]
});

MODEL({
  name: 'Primitive',
  traits: ['IntIDTrait'],
  help: 'Basic wrapper for a primitive that can be stored in DAOs and viewed ' +
      'using array- or DAO-based views',

  properties: [
    {
      name: 'value'
    }
  ]
});

MODEL({
  name: 'Int',
  extendsModel: 'Primitive',
  traits: ['IntIDTrait'],
  help: 'Wrapper for integers. This is exploited by views that expect ' +
      'properties to be modeled objects',

  properties: [
    {
      type: 'Int',
      name: 'value',
      preSet: function(_, newValue) {
        var parsedValue = parseInt(newValue);
        if (parsedValue !== NaN) {
          return parsedValue;
        } else {
          return 0;
        }
      },
      defaultValue: 0
    }
  ]
});


MODEL({
  name: 'String',
  extendsModel: 'Primitive',
  traits: ['IntIDTrait'],
  help: 'Wrapper for strings. This is exploited by views that expect ' +
      'properties to be modeled objects',

  properties: [
    {
      type: 'String',
      name: 'value',
      defaultValue: ''
    }
  ]
});

MODEL({
  name: 'RangeDescriptionTrait',
  help: 'Shorthand for adding a description of a variable range.',
  issues: 'Augment this to support range enforcement, not just description',

  properties: [
    {
      model_: 'StringProperty',
      name: 'rangeDescription',
      help: 'Description of the range of a value'
    }
  ]
});

MODEL({
  name: 'DefaultDescriptionTrait',
  help: 'Shorthand for adding a default description to a property.',

  properties: [
    {
      model_: 'StringProperty',
      name: 'defaultDescription',
      help: 'Description of a default value'
    }
  ]
});

// Construct models: RangeDefaultStringPoperty and RangeDefaultIntProperty with
// associated traits.
['StringPoperty', 'IntProperty'].forEach(function(basePropName) {
  MODEL({
    name: 'RangeDefault' + basePropName,
    extendsModel: basePropName,
    traits: ['RangeDescriptionTrait', 'DefaultDescriptionTrait']
  });
});

MODEL({
  name: 'BasicURLPartMatcher',
  traits: ['IntIDTrait'],
  help: 'Modeled object for the simpler aspects of Chrome events UrlFilters.',

  properties: [
    {
      model_: 'StringProperty',
      name: 'part',
      view: {
        model_: 'ChoiceView',
        choices: [
          ['host', 'Host'],
          ['path', 'Path'],
          ['query', 'Query'],
          ['url', 'URL']
        ]
      },
      defaultValue: 'host'
    },
    {
      model_: 'StringProperty',
      name: 'matchType',
      view: {
        model_: 'ChoiceView',
        choices: [
          ['contains', 'Contains'],
          ['equals', 'Equals'],
          ['prefix', 'Prefix'],
          ['suffix', 'Suffix']
        ]
      },
      defaultValue: 'contains'
    },
    {
      model_: 'StringProperty',
      name: 'value'
    }
  ],

  methods: {
    toURLFilterProperty: function() {
      return {
        name:
            this.part +
            this.matchType[0].toUpperCase() +
            this.matchType.slice(1),
        value: this.value
      };
    }
  }
});

MODEL({
  name: 'AdvancedURLPartMatcher',
  traits: ['IntIDTrait'],
  help: 'Modeled object for the UrlPattern-based aspects of Chrome events ' +
      'UrlFilters.',

  properties: [
    {
      model_: 'StringProperty',
      name: 'part',
      view: {
        model_: 'ChoiceView',
        choices: [
          ['url', 'URL'],
          ['originAndPath', 'Origin and Path']
        ]
      },
      defaultValue: 'url'
    },
    {
      model_: 'StringProperty',
      name: 'value'
    }
  ],

  methods: {
    toURLFilterProperty: function() {
      return {
        name: this.part + 'Matches',
        value: this.value
      };
    }
  }
});

MODEL({
  name: 'URLFilter',
  traits: ['IntIDTrait'],
  help: 'Modeled object for Chrome events UrlFilters.',
  seeAlso: 'https://developer.chrome.com/extensions/events#type-UrlFilter',
  label: 'URL Filter',
  issues: '[name]Values pseudo-properties should generalized as a decorator',

  properties: [
    {
      model_: 'ArrayProperty',
      subType: 'BasicURLPartMatcher',
      name: 'basicMatches',
      view: 'URLFilterListView',
      factory: function() {
        return [];
      }
    },
    {
      model_: 'ArrayProperty',
      subType: 'AdvancedURLPartMatcher',
      name: 'advancedMatches',
      view: 'URLFilterListView',
      factory: function() {
        return [];
      }
    },
    {
      model_: 'ArrayProperty',
      subType: 'String',
      name: 'schemes',
      factory: function() {
        return [];
      }
    },
    {
      name: 'schemeValues',
      getter: function() {
        return this.schemes.map(function(s) {
          return s.value;
        });
      },
      hidden: true
    },
    {
      model_: 'ArrayProperty',
      subType: 'Int',
      name: 'ports',
      factory: function() {
        return [];
      }
    },
    {
      name: 'portValues',
      getter: function() {
        return this.ports.map(function(p) {
          return p.value;
        });
      },
      hidden: true
    }
  ],

  methods: [
    {
      name: 'toRequestMatcher',
      help: 'Construct a Chrome declarative web request RequestMatcher ' +
          'object by mapping over properties of this object.',
      code: function() {
        var urlFilter = {};
        var schemes = this.schemeValues.slice(0);
        var ports = this.portValues.slice(0);
        if (schemes.length > 0) {
          urlFilter.schemes = schemes;
        }
        if (ports.length > 0) {
          urlFilter.ports = ports;
        }

        ['basicMatches', 'advancedMatches'].map( // Extract: [[{name, value}]]
            function(propName) {
              return this[propName].map(function(m) {
                    return m.toURLFilterProperty();
              });
            }.bind(this)
        ).reduce( // Reduce to [{name, value}]
                function(acc, innerArr) {
                  return acc.concat(innerArr);
                }
        ).forEach( // Add [{name, value}] to urlFilter
                    function(nv) {
                      urlFilter[nv.name] = nv.value;
                    }
        );

        console.log('return a new webViewRequest.RequestMatcher');
        console.log('urlFilter: ' + JSON.stringify(urlFilter));
        return new chrome.webViewRequest.RequestMatcher({ url: urlFilter });
      }
    }
  ]
});

MODEL({
  name: 'AppConfig',
  traits: ['IntIDTrait'],

  properties: [
    {
      model_: 'StringProperty',
      name: 'appName',
      issues: 'Binding to app window title not yet implemented',
      view: {
        model_: 'TextFieldView',
        required: true
      }
    },
    {
      model_: 'StringProperty',
      name: 'version',
      view: {
        model_: 'TextFieldView',
        placeholder: '0.1',
        required: true
      },
      defaultValue: '0.1'
    },
    {
      model_: 'StringProperty',
      name: 'heading',
      getter: function() {
        if (this.appName) {
          return this.appName;
        } else {
          return 'Config ' + this.id;
        }
      },
      hidden: true
    },
    {
      model_: 'StringProperty',
      name: 'homepage',
      view: 'TextFieldView',
      view: {
        model_: 'TextFieldView',
        placeholder: 'http://www.example.com',
        type: 'url',
        required: true
      }
    },
    {
      model_: 'StringProperty',
      name: 'rotation',
      label: chrome.i18n.getMessage('app_config__rotation__label'),
      help: chrome.i18n.getMessage('app_config__rotation__help'),
      view: {
        model_: 'ChoiceView',
        choices: [
          ['0', '0'],
          ['90', '90'],
          ['180', '180'],
          ['270', '270']
        ]
      }
    },
    {
      model_: 'BooleanProperty',
      name: 'kioskEnabled',
      label: chrome.i18n.getMessage('app_config__kiosk_enabled__label'),
      help: chrome.i18n.getMessage('app_config__kiosk_enabled__help'),
      factory: function() {
        return true;
      },
      issue: 'Consider changing download button title based on this',
    },
    {
      model_: 'BooleanProperty',
      name: 'shouldLoadGlobalConfig',
      help: 'This is a hidden indicator variable that triggers KioskView to ' +
          'look for a different config in a global location.',
      issues: 'This is a hack. We should do something better.',
      hidden: true,
      defaultValue: true
    }
  ],

});

// We include this in models because it is a known dependency of both
// controllers and views. The controller uses it to get deep notifications
// on the config so it can put() the config to the persistent store.
// The KioskView listens for deep notifications on its config to ensure that
// it reflects the latest perspective of the config.
MODEL({
  name: 'ListenToAllTrait',
  help: 'To start listening for updates foo and all (sub-)collections in' +
      'foo,  use this trait, implement an onDataUpdate listener for updates, ' +
      'and invoke this.listenToAll(undefined, foo).',
  issues: 'Currently must use a unified listener for all objects ever passed ' +
      'to this.listenForAll(). It would be nice if a different listener ' +
      'could be injected each time. This would require a store of listener ' +
      'functions so that the right function gets passed to removeListener().',

  methods: {
    listenToAll: function(oldValue, newValue) {
      if (oldValue && oldValue.removeListener) {
        console.log('Listen to all: Removing listener');
        oldValue.removeListener(this.onDataUpdate_);
      }
      if (newValue && newValue.addListener) {
        console.log('Listen to all: Adding listener');
        newValue.addListener(this.onDataUpdate_);
      }
    }
  },

  listeners: [
    {
      name: 'onDataUpdate_',
      code: function(publisher, topic, oldValue, newValue) {
        if (!topic || !topic[1]) {
          return;
        }

        console.log('Listen to all: rebinding data');
        console.log('topic: ' + topic[1]);
        this.onDataUpdate.apply(this, arguments);

        var propertyName = topic[1];
        if (publisher &&
            publisher.model_ &&
            publisher.model_.properties &&
            publisher.model_.properties.filter) {
          var propArr = publisher.model_.properties.filter(function(p) {
            return p.name === propertyName;
          }.bind(this));
          if (!propArr[0]) {
            return;
          }
          var prop = propArr[0];
          if (ArrayProperty.isInstance(prop)) {
            oldValue.forEach(function(arrElem) {
              this.listenToAll(arrElem, undefined);
            }.bind(this));
            newValue.forEach(function(arrElem) {
              this.listenToAll(undefined, arrElem);
            }.bind(this));
          }
        }
      }
    }
  ]
});

//enterprise/deployments/cse/cab_v1/src/js/views.js
MODEL({
  name: 'CSSClassesTrait',
  help: 'Convenience function for concatenating multiple CSS class strings, ' +
      'each of which may contain a series of class names',
  issues: 'Deprecate this and use className and extraClassName built in to ' +
      'views instead.',

  methods: {
    classes: function() {
      var classStr = Array.prototype.slice.call(arguments, 0).reduce(
          function(previousValue, currentValue) {
            if (previousValue) {
              previousValue.push(currentValue);
            }
            return previousValue;
          },
          []
          ).join(' ');
      if (classStr) {
        return 'class="' + classStr + '"';
      } else {
        return '';
      }
    }
  }
});

// Provide placeholders to TextFieldViews and TextAreaViews when
// rangeDescription and/or defualtDescription are provided.
['TextFieldView', 'TextAreaView'].forEach(
    function(designerPlaceholderGetter, baseViewName) {
      MODEL({
        name: 'RangeDefault' + baseViewName,
        extendsModel: baseViewName,

        properties: [
          {
            name: 'rangeDescription'
          },
          {
            name: 'defaultDescription'
          },
          {
            model_: 'StringProperty',
            name: 'placeholder',
            getter: designerPlaceholderGetter
          }
        ]
      });
    }.bind(this, function() {
      var str = '';

      if (this.rangeDescription) {
        str += this.rangeDescription;
        if (this.defaultDescription) {
          str += ' (Default: ' + this.defaultDescription + ')';
        }
      } else if (this.defaultDescription) {
        str += ' Default: ' + this.defaultDescription;
      }
      return str;
    })
);

MODEL({
  name: 'KioskView',
  extendsModel: 'DetailView',
  traits: ['CSSClassesTrait', 'ListenToAllTrait'],
  requires: [
    'AppConfig'
  ],
  help: 'A view of a kiok that receives a kiosk configuration as its data.',
  issues: [
    'CSS/Layout: It looks like the <webview> is laying out just a little too ' +
        'large. The content is clipped slightly from the botom of the window.'
  ],

  properties: [
    {
      name: 'data',
      postSet: function(old, v) {
        console.log('********** post set');
        this.listenToAll(old, v);
        this.rebindData();
      }
    },
    {
      model_: 'StringProperty',
      name: 'containerClass',
      defaultValue: 'full trim flex-container column'
    },
    {
      model_: 'StringProperty',
      name: 'contentClass',
      defaultValue: 'trim flex full rel'
    },
    {
      model_: 'StringProperty',
      name: 'webviewClass',
      defaultValue: 'trim full ggbview'
    },
    {
      name: 'webview',
      getter: function() {
        return $(this.id + '-webview');
      }
    },
    {
      name: 'webViewRequest',
      defaultValue: chrome.webViewRequest
    },
    {
      model_: 'IntProperty',
      name: 'displayTime',
      help: 'Display settings notion of time; used to avoid unnecessary ' +
          'rotation reloads',
      defaultValue: 0
    },
    {
      model_: 'IntProperty',
      name: 'listTime',
      help: 'Blacklist/whitelist notion of time; used to avoid unnecessary ' +
          'list reloads',
      defaultValue: 0
    }
  ],

  methods: {
    init: function() {
      this.SUPER();
      if (this.data && this.data.shouldLoadGlobalConfig && config) {
        console.log('Loading global config');
        this.data = this.AppConfig.create(config);
      }
    },
    initHTML: function() {
      this.SUPER();
      this.rebindData();
    },
    initInnerHTML: function() {
      this.SUPER();
      this.webview.addEventListener('permissionrequest', function(e) {
        // TODO(ebeach): Show permission to user.
        if (e.permission === 'download' || e.permission === 'media' ||
            e.permission === 'geolocation' ||
            e.permission === 'pointerLock') {
          e.request.allow();
        }
      });
    },
    rebindData: function() {
      this.updateHTML();
      console.log('on rebindData, kioskEnabled: ' +
          this.data.kioskEnabled);

      this.rotateView();
      this.rebuildBWLists();
      console.log('navigate to: ' + this.data.homepage);
      this.navigateTo(this.data.homepage);
    },
    rotateView: function() {
      if (chrome && chrome.system && chrome.system.display &&
          chrome.system.display) {
        this.displayTime++;
        chrome.system.display.getInfo(function(cfg, myTime, displays) {
          if (this.displayTime !== myTime) {
            return;
          }

          var displaysAlreadyAligned = true;
          var parsedRotation = parseInt(cfg.rotation);
          var cfgRotation = !isNaN(parsedRotation) ? parsedRotation : 0;
          displays.forEach(function(cfgRotation, display) {
            if (display.rotation !== cfgRotation)
              displaysAlreadyAligned = false;
          }.bind(this, cfgRotation));
          if (!displaysAlreadyAligned) {
            displays.forEach(function(cfgRotation, display) {
              chrome.system.display.setDisplayProperties(
                  display.id,
                  { rotation: cfgRotation },
                  function() {
                    if (chrome.runtime.lastError) {
                      console.log('Set rotation failed: ' +
                          chrome.runtime.lastError.message);
                    } else {
                      console.log('Set rotation succeeded');
                    }
                  }
              );
            }.bind(this, cfgRotation));
          }
        }.bind(this, this.data, this.displayTime));
      }
    },
    rebuildBWLists: function() {
      if (!this.webview) {
        console.log('rebuildBWLists: MISSING WEBVIEW');
        return;
      }
      this.listTime++;
      this.webview.request.onRequest.removeRules(
          undefined,
          function(cfg, myTime) {
            if (this.listTime !== myTime ||
                (!cfg.enableWhitelist && cfg.enableBlacklist)) {
              return;
            }

            var webViewRequest = this.webViewRequest;
            var rules = [];
            if (cfg.enableWhitelist) {
              console.log('WHITELIST ENABLED');
              rules.push({ // Block everything by default
                priority: 100,
                conditions: [
                  new webViewRequest.RequestMatcher(
                      { url: { urlContains: '' } }
                  )
                ],
                actions: [new webViewRequest.CancelRequest()]
              });
              var whitelistConditions =
                  cfg.whitelist.map(
                  function(urlFilter) { return urlFilter.toRequestMatcher(); }
                  );
              if (whitelistConditions.length > 0) {
                rules.push({ // Ignore blocking when whitelist condition is met
                  priority: 200,
                  conditions: whitelistConditions,
                  actions: [new webViewRequest.IgnoreRules({
                    lowerPriorityThan: 200
                  })]
                });
              }
            }
            if (cfg.enableBlacklist) {
              console.log('BLACKLIST ENABLED');
              var blacklistConditions =
                  cfg.blacklist.map(
                  function(urlFilter) {
                    return urlFilter.toRequestMatcher();
                  }
                  );
              if (blacklistConditions.length > 0) {
                rules.push({ // Block everything on the blacklist
                  priority: 300,
                  conditions: blacklistConditions,
                  actions: [new webViewRequest.CancelRequest()]
                });
              }
            }
            if (rules.length > 0) {
              this.webview.request.onRequest.addRules(
                  rules,
                  function() { console.log('RULES ADDED'); }
              );
            } else {
              console.log('NO RULES TO ADD');
            }
          }.bind(this, this.data, this.listTime)
      );
    },
    navigateTo: function(url) {
      if (!this.webview) {
        console.log('navigateTo: MISSING WEBVIEW');
        return;
      }
      
      this.webview.src = url;
      // Address https://bugs.chromium.org/p/chromium/issues/detail?id=799970
      this.webview.focus();
    },
    shouldHideControls: function() {
      return true;
    }
  },

  listeners: [
    {
      name: 'onLogout',
      code: function() {
        console.log('* onLogout clicked *');
        this.onClearSessionData();
        this.onSessionEnded();
        // Address https://bugs.chromium.org/p/chromium/issues/detail?id=779968
        this.webview.focus();
      }
    },
    {
      name: 'onBindBttn',
      issues: 'It appears that when buttons are added/removed, all buttons ' +
          '(past and present) get rebound. This is not right!',
      code: function(listener) {
        this.webview.addEventListener('loadstop', listener);
      }
    },
    {
      name: 'onBindAddr',
      issues: 'Ditto to onBindBttn todo',
      code: function(listener) {
        this.webview.addEventListener('loadcommit', function(e) {
          if (e.isTopLevel) {
            listener.apply(this, arguments);
          }
        });
      }
    },
    {
      name: 'onDataUpdate',
      help: 'Rebind data from config to webview whenever there is any change ' +
          'made to the config',
      code: function() {
        this.rebindData();
      }
    },
    {
      name: 'onSessionEnded',
      code: function() {
        console.log('Session ended; going home');
        this.navigateTo(this.data.homepage);
      }
    },
    {
      name: 'onClearSessionData',
      code: function() {
        console.log('Session data timed out; clearing data');
        this.webview.clearData(
            {},
            {'appcache': true, 'cookies': true},
            function() {
              console.log('Data cleared');
            }.bind(this)
        );
      }
    }
  ],

  templates: [
  
   function toHTML() {/*
        <div id="{{{this.id}}}" {{{this.classes(this.containerClass)}}}>
         {{{this.toInnerHTML()}}}
        </div>
      */},
      function toInnerHTML() {/*
        <div {{{this.classes(this.contentClass)}}}>
         
          <webview partition="static" id="{{{this.id}}}-webview"
                   {{{this.classes(this.webviewClass)}}}>
          </webview>
        </div>
    */}
  ]
});

