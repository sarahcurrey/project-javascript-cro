var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

window.optimizely = window.optimizely || [];
var PJS = {};
PJS.isDev = /cro(metrics)?-debug|optimizely_local/.test(window.location.search) || localStorage && localStorage.getItem("cro-debug");
PJS.log = PJS.isDev && console && console.info && console.info.bind(console, '[PJS]') || function () {};
PJS.error = function (errorCode, details) {
  if (console && console.error) console.error('PJS Error:', errorCode, '\n', details);
};

try {
  (function () {
    /**
      Detect Async Loading
      @author Amanda Smith <amanda.smith@crometrics.com>
      Last Modified: 12/7/18
    
      Attempts to detect whether Optimizely is running async.
      Done by looking for a body element -- if Optly is sync
      and running in the head, it should render-block the 
      body from being loaded while the PJS is running.
    */

    if (!!document.querySelector("body")) {

      // we can change this to do something fancier later
      PJS.log("Nonstandard Optimizely loading detected! Check whether the snippet is running async, " + "through a tag manager, or in the body. Ideally Optimizely should be installed sync, directly in the head.");
    }
  })();
} catch (e) {
  PJS.error('x/detect-async', e);
}

try {
  (function () {
    /**
      Exclude Internet Explorer
      @author Amanda Smith <amanda.smith@crometrics.com>
      Last Modified: 12/7/18
      
      Disables Optimizely if the user is on any version of IE (but not Edge).
    */

    var agent = window.navigator.userAgent;

    // IE 10 or older and IE11 respectively
    if (agent.indexOf("MSIE ") > -1 || agent.indexOf("Trident/") > -1) {
      PJS.log("IE detected; disabling Optimizely");
      window.optimizely.push({
        "type": "disable"
      });
    }
  })();
} catch (e) {
  PJS.error('x/exclude-ie', e);
}

try {
  (function () {
    /**
     * Local Storage Required
     * @author Eric Newland <eric@crometrics.com>
     * @author Andrew Wessels <andrew.wessels@crometrics.com>
     * Date: 2/1/18
     *
     * Disable Optimizely if localStorage isn't available.
     */
    try {
      var key = 'optimizely-store-required';
      window.localStorage.setItem(key, true);
      window.localStorage.removeItem(key);
    } catch (e) {
      //Disable Optimizely if localStorage fails.
      window.optimizely.push({
        "type": "disable"
      });
    }
  })();
} catch (e) {
  PJS.error('x/local-storage-required', e);
}

try {
  (function () {
    var utils = PJS.utils = PJS.utils || {};

    //Scoped window.CustomEvent Polyfill:
    //Source: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
    utils.CustomEvent = function () {
      if (typeof window.CustomEvent === "function") return window.CustomEvent;

      //IE 9+ Polyfill:
      function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
      }
      CustomEvent.prototype = window.Event.prototype;
      return CustomEvent;
    }();

    utils.raf = function () {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
    }().bind(window);

    /**
     * @desc cookie.set() sets a cookie with optional days
     *  @param {String} name - the name of the cookie
     *  @param {String} value - the value of the cookie
     *  @param {Number} optDays - days the cookie will exist for
     *    NOTE: Not passing optDays will create a "Session Cookie"
     *  @return {Undefined}
     *
     * @desc cookie.get() gets value of cookie
     *  @param {String} name - name of cookie to get
     *  @return {String|Null} - string value of cookie NOT A BOOL!
     *
     * @desc cookie.del() removes cookie
     *  @param {String} name - name of cookie to delete
     *  @return {Undefined}
     */
    utils.cookie = {
      set: function set(name, value, optDays, domain) {
        var cookie = name + '=' + value;
        if (optDays) {
          var date = new Date();
          date.setTime(date.getTime() + optDays * 24 * 60 * 60 * 1000);
          cookie += '; expires=' + date.toGMTString();
        }
        if (domain) {
          cookie += '; domain=' + domain;
        }
        document.cookie = cookie + '; path=/';
      },
      get: function get(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
          var c = ca[i].trim();
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
      },
      del: function del(name) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      }
    };
    // intakes `"$9.99"` returns `9.99`
    utils.dollarToFloat = function (dollarString) {
      return parseFloat(dollarString.replace(/[\$,]/g, ''));
    };

    // intakes Number `9.9` and outputs `"$9.99"`
    utils.floatToDollar = function (num) {
      return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    /**
     * @desc getParam() gets a param value from window.location.search
     *
     * @param {String} name - key of param to find
     * @param {String} optSearch - optional search string to search in (default: window.location.search)
     *
     * @return {String} param value
     */
    utils.getParam = function (name, optSearch) {
      optSearch = optSearch || window.location.search;
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
          results = regex.exec(optSearch);
      return results && decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    /**
     * @desc redirect() Redirects the user to a new url
     *
     * @param {string} [url] - The new url
     */
    utils.redirect = function (url) {
      //Optimizely's redirect snippet:
      var obj = { redir: document.createElement('a') };
      obj.redir.href = url;
      obj.cur = window.location.search;
      if (obj.cur) {
        obj.redir.search = obj.redir.search ? obj.cur + '&' + obj.redir.search.slice(1) : obj.cur;
      }
      window.location.replace(obj.redir.href);
    };

    /**
     * @desc slugify() Returns the 'slug' of a string (replaces non-word characters with hyphens)
     * Borrowed from https://gist.github.com/mathewbyrne/1280286
     *
     * @param {string} [text] - The string you'd like to slugify
     *
     * @return {string} - A slugified version of the string
     */
    utils.slugify = function (text) {
      return text.toString().toLowerCase().replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
    };

    /**
     * @desc throttle() - borrowed from http://underscorejs.org/docs/underscore.html
     *
     * @param {Function} func - the function to be throttled
     * @param {Number} wait - milliseconds to be waited before calling func again
     * @param {Object} options - optional param, disables leading or trailing call
     *
     * @return {Function} - calls the function called in param one
     */
    utils.throttle = function (func, wait, options) {
      var context = void 0,
          args = void 0,
          result = void 0;
      var timeout = null;
      var previous = 0;
      if (!options) options = {};
      var later = function later() {
        previous = options.leading === false ? 0 : new Date().getTime();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      };
      return function () {
        var now = new Date().getTime();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout); /* global clearTimeout */
            timeout = null;
          }
          previous = now;
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining); /* global setTimeout */
        }
        return result;
      };
    };

    /**
     * @desc debounce() prevents a function from being invoked repeatedly.
     * The function will be called again after it stops being called for N milliseconds.
     *
     * @param {Function} fn - the function to debounce
     * @param {Number} wait - rate limit in milliseconds
     * @param {Boolean} [leading=false] - if true, trigger fn on leading edge
     *
     * @return {Function} - the debounced function
     */
    utils.debounce = function (fn, wait) {
      var leading = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var timeout = void 0;

      return function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        function later() {
          timeout = null;
          if (!leading) fn.apply(undefined, args);
        }

        var callNow = leading && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) fn.apply(undefined, args);
      };
    };

    /**
     * @class utils.OnOff failsafe on/off switch
     * Creates a switch with on and off callback functions.
     * It prevents the switch from activating multiple times if it's
     * already active. Similar functionality when inactive.
     *
     * @param {function} start run when the switch is turned on
     * @param {function} stop run when the switch is turned off
     * Example:
        let page = new utils.OnOff(function on(){
          $(document).on('mousedown touchstart', eventHandler);
        }, function off(){
          $(document).off('mousedown touchstart', eventHandler);
        });
        page.on();
        ...
        page.off();
    */
    utils.OnOff = function (start, stop) {
      this.active = false;
      this.start = start;
      this.stop = stop || function () {};
    };
    utils.OnOff.prototype.on = function (force) {
      if (force !== true && this.active) return;
      this.active = true;
      this.start();
    };
    utils.OnOff.prototype.off = function (force) {
      if (force !== true && !this.active) return;
      this.active = false;
      this.stop();
    };

    /**
     * Extend Optimizely's utils singleton with the additional methods above
     */
    var extend = function extend() {
      var utils = window.optimizely.get('utils');

      //Add the generic PJS utils to the Optimizely utils:
      for (var fnName in PJS.utils) {
        utils[fnName] = PJS.utils[fnName];
      }

      if (PJS.isDev) utils.isDev = true;

      /**
       * @desc log() console.logs based on PJS.isDev status
       *
       * @param {...args} args - prefixed with 'crometrics:'
       *
       * @return {null}
       */
      utils.log = function () {
        var _console;

        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        if (PJS.isDev) (_console = console).info.apply(_console, ['[cro]'].concat(args));
      };

      /**
       * @desc waitForjQuery() waits for window.jQuery to become available
       * @return {utils.Promise} resolves when jQuery becomes available, returns a reference
       */
      utils.waitForjQuery = function () {
        var jQueryPromise = void 0;
        return function () {
          //lazy load the polling since it may not always be necessary
          if (!jQueryPromise) jQueryPromise = utils.waitUntil(function () {
            return typeof window.jQuery === 'function';
          }).then(function () {
            return window.jQuery;
          });
          return jQueryPromise;
        };
      }();

      /**
       * @desc rafael: Request Animation Frame + Await ELement.
       *  Uses waitForElement() then resolves after the next animation frame.
       *  This is to ensure that the element's content is available when the promise resolves.
       * @param {string} selector css selector; same as waitForElement(selector)
       * @return {utils.Promise} resolves with the requested element
       */
      utils.rafael = function (selector) {
        return utils.waitForElement(selector).then(function (el) {
          return new utils.Promise(function (resolve) {
            utils.raf(function () {
              resolve(el);
            });
          });
        });
      };

      /**
       * @desc ajaxSuccess(callback) waits for window.jQuery to become available
       *   then attaches an ajaxSuccess event handler to the document.
       * @param {function} callback is the callback used by ajaxSuccess.
       *  The callback receives three arguments: event, request, settings
       * @return {undefined}
       */
      utils.ajaxSuccess = function (callback) {
        utils.waitForjQuery().then(function ($) {
          $(document).ajaxSuccess(callback);
        });
      };

      /**
       * @desc loadScript() loads a script and fires callback
       *
       * @param {String} url - url of script to load
       *
       * @return {utils.Promise}
       */
      utils.loadScript = function (url) {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = url;
        var returnPromise = new utils.Promise(function (resolve, reject) {
          ga.onload = resolve;
          ga.onerror = reject;
        });
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
        return returnPromise;
      };
    };

    if (window.optimizely.initialized) {
      extend(); //This only happens in preview mode via Optimizely UI
    } else {
      window.optimizely.push({
        'type': 'addListener',
        'filter': {
          'type': 'lifecycle',
          'name': 'initialized'
        },
        'handler': extend
      });
    }
  })();
} catch (e) {
  PJS.error('x/pjs-utilities', e);
}

try {
  (function () {
    /*
    
      9/13/18 Update: DEPRECATED. Optly has this OOTB now so we shouldn't need to add it.
    
      Basic Mobile vs. Desktop Segmentation
      Author: tom@crometrics.com, andrew.wessels@crometrics.com
      Date: 05/25/17
      Last Update: 8/30/17
      Version: crometrics-mobile-vs-desktop-segmentation-1.0.1
      Docs:
        https://help.optimizely.com/Target_Your_Visitors/Custom_Attributes%3A_Capture_visitor_data_through_the_API_in_Optimizely_X
        https://developers.optimizely.com/x/solutions/javascript/reference/index.html#function_setuser
    
      Segment users around the visitor device.
    */
    //Wait for optimizely activation so visitor data is populated.
    var activated = function activated() {
      var isMobile = !!/mobile|iphone/i.test(window.optimizely.get('visitor').device);
      window.optimizely.push({
        "type": "user",
        "attributes": {
          "is_mobile": isMobile.toString()
        }
      });
    };
    window.optimizely.push({
      type: "addListener",
      filter: {
        type: "lifecycle",
        name: "activated"
      },
      handler: activated
    });
  })();
} catch (e) {
  PJS.error('x/mobile-vs-desktop-segmentation', e);
}

try {
  (function () {
    /*
      Hide QA Modal
      Author: Eric Newland (eric@crometrics.com)
      Last Modified: 05/02/17
      Version: crometrics-hideqamodal-1.0.0
    
      Logic for hiding the QA modal in Optimizely X
    */
    function getCookie(name) {
      'use strict';

      var nameEQ = name + '=';
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    }

    function getParam(name, optSearch) {
      'use strict';

      optSearch = optSearch || location.search;
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
          results = regex.exec(optSearch);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    var hideModal = function hideModal() {
      var qaParam = getParam('qa');
      if (qaParam === 'hide') {
        // Set a long-term cookie that will hide the modal at all resolutions.
        var date = new Date();
        date.setFullYear(date.getFullYear() + 10);
        document.cookie = 'CRO_HideQAModal=true; path=/; expires=' + date.toUTCString() + ';';
      } else if (qaParam === 'show') {
        // Clear the cookie.
        document.cookie = 'CRO_HideQAModal=true; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }

      var cookie = getCookie('CRO_HideQAModal');
      if (cookie) {
        var html = document.documentElement;
        html.className += ' hide-optly-qa-modal';
      }

      // CSS to go inside a media query for small screens
      var hideModalMobile = 'optly-preview__firstvisit { display: none; } optly-preview { top: 75px; right: 15px; max-width: calc(100vw - 30px); } optly-preview optly-wrap { border-width: 0; } optly-preview.is-collapsed { opacity: .25; } optly-preview .optly-tabs-nav__item:last-child { padding-left: 40px; }';

      // Add our cookie class to each rule and add an additional rule for large screens only.
      // This will appear outside the mobile media query.
      var hideModalEverywhere = hideModalMobile.replace(/([^}]*})/gi, '.hide-optly-qa-modal $1') + ' @media (min-width:471px) and (min-height:701px) { .hide-optly-qa-modal optly-preview.is-collapsed:hover { opacity: 1; } }';
      document.addEventListener('DOMContentLoaded', function () {
        var mediaQuery = document.createElement('style');
        mediaQuery.innerHTML = '@media (max-width: 470px), (max-height: 700px) { ' + hideModalMobile + ' } ' + hideModalEverywhere;
        document.body.appendChild(mediaQuery);
      }, false);
    };

    // Paste from here down into PJS with Optimizely already initialized.
    window.optimizely.push({
      type: "addListener",
      filter: {
        type: "lifecycle",
        name: "initialized"
      },
      handler: hideModal
    });
  })();
} catch (e) {
  PJS.error('x/hide-qa-modal', e);
}

try {
  (function () {
    /**
     * HotJar Triggering and Recording Tagging
     * @author matthew.gossage@crometrics.com (2/3/17)
     * @author chase.marlow@crometrics.com (12/22/17)
     * @author amanda.smith@crometrics.com (5/22/18)
     * @author andrew.wessels@crometrics.com (7/9/18)
     *
     * Adds a `campaignDecided` listener and uses it to trigger and tag hotjar recordings.
     */

    //Note: name values are not available if "Mask descriptive names in project code and third-party integrations" snippet privacy setting is enabled.
    var parseTag = function parseTag(name) {
      var availableCharacters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 36;

      if (name) {
        var nameMatch = name.match(/^([a-zA-Z]+)-?([\d\.]+)/);
        if (nameMatch) {
          return '' + nameMatch[1].toLowerCase() + nameMatch[2];
        } else {
          return name.toLowerCase().substr(0, availableCharacters).trim().replace(/[^a-z0-9]+/g, '-');
        }
      }
    };

    var getCampaignTag = function getCampaignTag(campaign, experience, availableCharacters) {
      var campaignName = parseTag(experience.campaignName) || campaign.id || 'unknown';
      //experience.name if a name is explicitly set, experience.audienceName if one is implicitly given
      var audienceName = parseTag(experience.name || experience.audienceName) || experience.id || 'unknown';
      if (campaignName.length + audienceName.length + 1 > availableCharacters) {
        //if the name is too long, trim the longer of the two values
        if (campaignName.length > audienceName.length) {
          campaignName = campaignName.substr(0, availableCharacters - audienceName.length - 1);
        } else {
          audienceName = audienceName.substr(0, availableCharacters - campaignName.length - 1);
        }
      }
      return campaignName + '-' + audienceName;
    };

    var getExperimentTag = function getExperimentTag(experiment, availableCharacters) {
      return parseTag(experiment.name, availableCharacters) || experiment.id || 'unknown';
    };

    // Trigger and Tag Hotjar.
    var campaignDecided = function campaignDecided(event) {
      // Also, only track if we're not part of the holdback.
      if (event.data.decision.isCampaignHoldback === false && event.data.decision.variationId !== null) {
        var decision = event.data.decision;
        var campaign = event.data.campaign;
        var experiment = window.optimizely.get('data').experiments[decision.experimentId];

        var varTag = function (variations, variationId) {
          for (var i = 0; i < variations.length; i++) {
            if (variations[i].id === variationId) {
              return 'v' + i;
            }
          }
          return variationId;
        }(experiment.variations, decision.variationId);

        var availableCharacters = 50 - varTag.length - 1;

        var experimentTag = experiment.hasOwnProperty('campaignName') ? getCampaignTag(campaign, experiment, availableCharacters) : getExperimentTag(experiment, availableCharacters);

        //note: trigger_name.length must be <= 50
        var trigger_name = (experimentTag + '-' + varTag).substr(0, 50); //failsafe truncation

        ;(function pollforHJ() {
          if (window.hj && window.hj.q) {
            window.hj('trigger', trigger_name);
            window.hj('tagRecording', [trigger_name]);
            PJS.log('Triggered Hotjar: ' + trigger_name, event.data);
          } else setTimeout(pollforHJ, 500);
        })();
      }
    };

    window.optimizely.push({
      type: "addListener",
      filter: {
        type: "lifecycle",
        name: "campaignDecided"
      },
      // Add the campaignDecided function as a handler.
      handler: campaignDecided
    });
  })();
} catch (e) {
  PJS.error('x/hj', e);
}

try {
  (function () {
    (function () {
      'use strict';

      var getMoraf = function getMoraf($) {
        // Debug info to console (requires `Moraf.debug = true`)
        var _debug = false,
            _mutationCount = 0,
            _rafCount = 0;
        var debug = function debug() {
          var _console2;

          for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
          }

          if (_debug) (_console2 = console).info.apply(_console2, ['[Moraf]'].concat(args));
        };

        // Automated but optional jQuery integration
        var isJQ = function isJQ(obj) {
          if (obj && obj.fn && obj.fn.jquery) {
            debug('isJQ: jQuery library found.');
            return obj;
          } else {
            debug('isJQ: Not a valid jQuery library.');
            return false;
          }
        };

        // Attempt to grab jQuery from the most obvious places.
        var _jQ = isJQ($) || isJQ(jQuery) || isJQ(window.$) || isJQ(window.jQuery);

        // Should match any currently existing jQuery extended selector http://api.jquery.com/category/selectors/jquery-selector-extensions/
        var jQSelector = /(:(animated|button|checkbox|eq|even|file|first|gt|has|header|hidden|image|input|last|lt|odd|parent|password|radio|reset|selected|submit|text|visible)|\[[^\]]+!=[^\]]+\])/gi;

        // Gets elements by selector. Uses native function for pure CSS selectors and jQuery if a jQ extended selector is detected.
        var getElementsFromSelector = function getElementsFromSelector(selector) {
          var elements;
          if (jQSelector.test(selector)) {
            debug('jQuery selector detected in:', selector);
            elements = _jQ(selector).get();
          } else {
            debug('Standard CSS selectors only in:', selector);
            elements = document.querySelectorAll(selector);
          }
          return elements;
        };

        /**
         *  Shims
         */
        // requestAnimationFrame
        var _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
          debug('RAF: Browser does not support requestAnimationFrame.');
          window.setTimeout(callback, 1000 / 60);
        };

        // MutationObserver
        var WMutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver || false;

        // MutationObserver/fallback wrapper. Creates a MutationObserver if available, uses setInterval as a fallback.

        var Observer = function () {
          function Observer(callback) {
            _classCallCheck(this, Observer);

            this.observer = WMutationObserver ? new WMutationObserver(callback) : null;
            if (!this.observer) debug('MO: Browser does not support MutationObserver');
            this.callback = callback;
          }

          //


          _createClass(Observer, [{
            key: 'observe',
            value: function observe(element, init) {
              this.element = element;
              if (WMutationObserver) {
                this.observer.observe(element, init);
              } else {
                this.observer = setInterval(this.callback, 50);
              }
            }

            // MutationObserver.disconnect() polyfill

          }, {
            key: 'disconnect',
            value: function disconnect() {
              if (this.observer) {
                if (WMutationObserver) {
                  this.observer.disconnect();
                } else {
                  clearInterval(this.observer);
                }
              }
            }
          }]);

          return Observer;
        }();

        /**
         *  Moraf classes and helpers
         */


        var CREATE = 'create',
            CHANGE = 'change',
            TEXT = 'text';

        // Store all managers and Morafs in arrays to be iterated over.
        var allManagers = [],
            allMorafs = [];

        // This class allows multiple morafs to use the same observer if they are watching the same element and have the same type.

        var MorafManager = function () {
          function MorafManager(element, moraf) {
            _classCallCheck(this, MorafManager);

            var type = moraf.type,
                init = moraf.init,
                self = this;

            this.element = element;
            this.type = type;
            this.init = init;
            this.active = false;
            this.morafs = [moraf];

            // For create morafs, make sure matching elements don't already exist.
            if (moraf.type === CREATE) moraf.onMutate();
            if (moraf.active) {
              this.observer = new Observer(function (mutations) {
                self.onMutate(mutations);
              });
              this.observe(element, init);
              this.active = true;
            } else debug('Observer: Matching element(s) already exist and the moraf is satisfied. No need to observe further.');

            allManagers.push(this);

            debug('Observer: Created a new Observer\nWatching:', element, '\nFor:', init, '\nOn behalf of:', moraf);
          }

          _createClass(MorafManager, [{
            key: 'add',
            value: function add(moraf) {
              var element = this.element,
                  init = this.init,
                  self = this;

              // For create morafs, make sure matching elements don't already exist.

              if (moraf.type === CREATE) moraf.onMutate();
              this.morafs.push(moraf);

              // Will return false if this was a Create Moraf and a matching element was immediately found.
              if (moraf.active) {
                this.observer = this.observer || new Observer(function (mutations) {
                  self.onMutate(mutations);
                });
                this.observe();
                this.active = true;
                debug('Observer: Recycled an Observer\nWatching:', element, '\nFor:', init, '\nOn behalf of:', moraf);
              } else debug('Observer: Matching element(s) already exist and the moraf is satisfied.\nThis observer is ' + this.active ? ' still active because other morafs are still running.' : ' now inactive.');
            }
          }, {
            key: 'disconnect',
            value: function disconnect() {
              this.observer.disconnect();
            }
          }, {
            key: 'observe',
            value: function observe() {
              this.observer.observe(this.element, this.init);
            }

            // MutationObserver callback

          }, {
            key: 'onMutate',
            value: function onMutate(mutations) {
              _mutationCount++;
              for (var i = 0; i < allManagers.length; i++) {
                var manager = allManagers[i];
                if (manager.active) {
                  manager.active = false;
                  manager.disconnect();
                }
              }
              if (mutations) debug('MorafManager: Mutation(s) detected:', mutations, '\nRequesting animation frame...');else debug('MorafManager: Using setInterval fallback...');
              _requestAnimationFrame(function () {
                _rafCount++;
                debug.apply(undefined, _toConsumableArray(Moraf.stats()));

                // Check all morafs and managers to minimize total calls.
                for (var _i = 0; _i < allMorafs.length; _i++) {
                  var moraf = allMorafs[_i];
                  if (moraf.active) {
                    moraf.onMutate();
                    if (moraf.active) moraf.manager.active = true;
                  }
                }
                for (var _i2 = 0; _i2 < allManagers.length; _i2++) {
                  var _manager = allManagers[_i2];
                  if (_manager.active) _manager.observe();else debug('MorafManager: No more active Morafs on this manager. No longer observing.');
                }
              });
            }
          }]);

          return MorafManager;
        }();

        /**
         *  @callback morafCallback
         *  @param {*} $els - The new matching element(s) for a Create Moraf. Otherwise, the watched element.
         *  Will be a jQuery object if jQuery is available.
         *  @param {Moraf} moraf - The Moraf instance this callback is tied to.
         */

        /* jshint -W003 */
        /** Moraf class. */


        var Moraf = function () {
          /* jshint +W003 */
          /**
           *  @desc Moraf() Create a new Moraf from scratch. Using one of the factory methods is recommended.
           *
           *  @param {Object} data - All of the Moraf's initialization data.
           *  @param {string} data.type - "create", "change", and "text" are allowed. This determines what the Observer will be watching for.
           *  @param {*} data.element - HTML element/node that will be observed.
           *  @param {morafCallback} data.callback - The callback to be executed when a qualifying mutation is observed.
           *  @param {boolean} [data.multi=true] - Whether the Observer should keep watching for this moraf after the first time the callback runs.
           *  @param {?string} data.selector - For "create" Morafs, the selector of the child element(s) we are watching for.
           *  @param {?Array.<string>} data.attributes - For "change" Morafs, the names of the attributes we will be watching. If null, we will watch all of them.
           *  @param {?string|RegExp|Array.<string|RegExp>} data.conditions - For "change" Morafs, an array of strings or RegExps to be matches against the watched attributes.
              These conditions will be matched by index, so `attributes[index]` will be tested against `conditions[index]`.
              For "text" Morafs, this is simply a single string or RegExp to be matches against the element's new text content.
           */
          function Moraf(data) {
            _classCallCheck(this, Moraf);

            var keys = Object.keys(data);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              this[key] = data[key];
            }
            var element = this.element,
                type = this.type;

            if (_jQ) this.$element = _jQ(element);
            switch (type) {
              case CREATE:
                this.init = {
                  childList: true,
                  subtree: true
                };
                this.processed = [];
                break;

              case CHANGE:
                this.init = {
                  attributes: true
                };
                this.attributeMap = this.getAttributeMap();
                debug('Moraf: Initial attributes:', this.attributeMap);
                break;

              case TEXT:
                this.init = {
                  childList: true,
                  characterData: true,
                  subtree: true
                };
                break;
            }
            this.active = true;

            allMorafs.push(this);
            this.getManager();
            debug('Moraf: New moraf created:', this);
          }

          _createClass(Moraf, [{
            key: 'getManager',
            value: function getManager() {
              var element = this.element;
              for (var i = 0; i < allManagers.length; i++) {
                var manager = allManagers[i];
                if (element === manager.element) {
                  manager.add(this);
                  this.manager = manager;
                  return;
                }
              }
              this.manager = new MorafManager(element, this);
            }

            // When a qualifying mutation occurs

          }, {
            key: 'onMutate',
            value: function onMutate() {
              var type = this.type,
                  $element = this.$element,
                  selector = this.selector,
                  processed = this.processed,
                  element = this.element,
                  callback = this.callback,
                  conditions = this.conditions,
                  text = this.text,
                  attributeMap = this.attributeMap,
                  multi = this.multi,
                  attributes = this.attributes;

              switch (type) {

                // Create observers
                case CREATE:
                  var created = void 0;
                  if ($element) {
                    created = $element.find(selector).not(processed).get();
                  } else {
                    var processedSet = new Set(processed);
                    var elements = element.querySelectorAll(selector);
                    var createdArray = Array.prototype.slice.call(elements);
                    created = createdArray.filter(function (x) {
                      return !processedSet.has(x);
                    });
                  }
                  if (created.length) {
                    debug('Moraf - Create: Valid new element(s) created:', created, '\nRunning callback for:', this);
                    this.processed = processed.concat(created);
                    debug('processed:', this.processed);
                    if (!multi) this.active = false;
                    var $created = _jQ ? _jQ(created) : false;
                    callback.apply(created, [$created || created, this]);
                  } else debug('Moraf - Create: No matches found.\nNot running the callback for:', this);
                  break;

                // Change observers
                case CHANGE:
                  var newAttributes = this.getAttributeMap();

                  //debug('attributes:',attributes);

                  for (var index = 0; index < attributes.length; index++) {
                    var name = attributes[index];
                    var oldValue = attributeMap[name],
                        newValue = newAttributes[name];
                    //debug('Change data:',index,name,oldValue,newValue);
                    if (oldValue !== newValue) {
                      if (conditions[index]) {
                        if (newValue.indexOf(conditions[index]) > -1) {
                          debug('Moraf - Change: Attribute change(s) match conditions. Running callback...');
                          if (!multi) this.active = false;
                          callback.apply(element, [$element || element, this]);
                          break;
                        }
                      } else {
                        debug('Moraf - Change: Attribute change detected. Running callback...');
                        if (!multi) this.active = false;
                        callback.apply(element, [$element || element, this]);
                        break;
                      }
                    }
                  }

                  this.attributeMap = newAttributes;

                  break;

                // Text observers
                case TEXT:
                  var newText = element.textContent;
                  if (newText !== text) {
                    if (!conditions || newText.indexOf(conditions) > -1) {
                      debug('Moraf - Text: Text change ' + (conditions ? 'matches conditions.' : 'detected.') + ' Running callback...');
                      if (!multi) this.active = false;
                      callback.apply(element, [element, this]);
                    }
                  }
                  this.text = newText;
                  break;
              }
            }

            // Method for creating a map of attributes and values from this moraf's element.

          }, {
            key: 'getAttributeMap',
            value: function getAttributeMap() {
              var map = {},
                  element = this.element,
                  attributes = this.attributes,
                  elemAttrs = element.attributes;
              if (elemAttrs) {
                if (!attributes) attributes = elemAttrs;
                for (var i = 0; i < attributes.length; i++) {
                  var name = attributes[i];
                  // Exception for href attributes on a link. Grab the element's href property, not the href "attribute" that will be an object reference.
                  if (name === 'href' && typeof attributes.href !== 'string' && element.href) map[name] = element.href;else map[name] = elemAttrs[name];
                }
              }

              return map;
            }

            /**
             *  Gets the corrent jQuery library Moraf is using or specifies a new one.
             */

          }], [{
            key: 'create',


            /*
             *  Factory methods for creating new Morafs by type.
             */

            /**
             *  @desc Moraf.create() Initializes a new "create" Moraf.
             *  @param {string} selector - CSS/jQuery selector of the new element(s) we are watching for.
             *  @param {*} [element=document] - Existing parent/ancestor element of the element(s) we are watching for.
             *  @param {morafCallback} callback - The callback to run when matching new elements are created.
             *  @param {boolean} [multi=true] Whether we should continue observing after the first qualifying element(s) are created.
             *
             *  @return {Moraf} - The created Moraf.
             */
            value: function create(selector) {
              var element,
                  callback,
                  multi = true;

              for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
                args[_key4 - 1] = arguments[_key4];
              }

              if (typeof args[0] === 'function') {
                element = document;
                callback = args[0];
                if (args[1] === false) multi = false;
              } else if (typeof args[0] === 'string') {
                // Element is a selector
                element = getElementsFromSelector(args[0])[0];
              } else if (args[0].nodeType > 0) {
                // Element is an HTML element
                element = args[0];
                callback = args[1];
                if (args[2] === false) multi = false;
              } else if (args[0][0].nodeType > 0) {
                // Element is a jQuery object
                element = args[0][0];
                callback = args[1];
                if (args[2] === false) multi = false;
              }

              var moraf = new Moraf({
                type: CREATE,
                callback: callback,
                selector: selector,
                element: element,
                multi: multi
              });

              return moraf;
            }

            /**
             *  @desc Moraf.change() Initializes a new "change" Moraf.
             *  @param {*} element - Selector, HTML element, or jQuery object (only the first element in the set will be used) to be watched.
             *  @param {?string|Array.<string>} attributes - Attribute(s) to watch, as an array or space separated list. If omitted, all attributes will be watched.
             *  @param {?string|RegExp|Array.<string|RegExp>} A string or RegExp that will be matches against the attribute value, if an attribute is passed.
                In case of multiple attributes, this must be an array of conditions that will be mapped in order to each attribute passed.
             *  @param {morafCallback} callback - The callback to run when the element's attributes change.
             *  @param {boolean} [multi=true] Whether we should continue observing after the first qualifying element(s) are created.
             *
             *  @return {Moraf} - The created Moraf.
             */

          }, {
            key: 'change',
            value: function change(el) {
              var element,
                  attributes,
                  conditions,
                  callback,
                  multi = true;
              if (typeof el === 'string') {
                // Element is a selector
                element = getElementsFromSelector(el)[0];
              } else if (el[0] && el[0].nodeType > 0) {
                // Element is a jQuery object
                element = el[0];
              } else element = el; // Element is a node

              // Properties passed.

              for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
                args[_key5 - 1] = arguments[_key5];
              }

              if (typeof args[0] === 'string' || Array.isArray(args[0])) {
                attributes = Array.isArray(args[0]) ? args[0] : args[0].split(' ');

                // Conditions not passed
                if (typeof args[1] === 'function') {
                  conditions = '';
                  callback = args[1];
                  if (args[2] === false) multi = false;
                }
                // Conditions passed
                else {
                    // Single condition
                    if (typeof args[1] === 'string' || args[1] instanceof RegExp) {
                      conditions = [args[1]];
                      // Array of conditions
                    } else if (Array.isArray(args[1])) {
                      conditions = args[1];
                    }
                    callback = args[2];
                    if (args[3] === false) multi = false;
                  }
              } else {
                attributes = [];
                conditions = [];
                callback = args[0];
                if (args[1] === false) multi = false;
              }

              var moraf = new Moraf({
                type: CHANGE,
                element: element,
                attributes: attributes,
                conditions: conditions,
                callback: callback,
                multi: multi
              });

              return moraf;
            }

            /**
             *  @desc Moraf.change() Initializes a new "text" Moraf.
             *  @param {*} element - Selector, HTML element, or jQuery object (only the first element in the set will be used) to be watched.
             *  @param {?string|RegExp} A string or RegExp that will be matches against the element's new text content.
             *  @param {morafCallback} callback - The callback to run when the element's text changes.
             *  @param {boolean} [multi=true] Whether we should continue observing after the first qualifying element(s) are created.
             *
             *  @return {Moraf} - The created Moraf.
             */

          }, {
            key: 'text',
            value: function text(el) {
              var element = void 0,
                  conditions = void 0,
                  callback = void 0,
                  multi = true;
              if (typeof el === 'string') {
                // Element is a selector
                element = getElementsFromSelector(el)[0];
              } else if (el[0] && el[0].nodeType > 0) {
                // Element is a jQuery object
                element = el[0];
              } else element = el; // Element is a node

              // Properties passed
              if (typeof (arguments.length <= 1 ? undefined : arguments[1]) === 'string') {
                conditions = arguments.length <= 1 ? undefined : arguments[1];
                callback = arguments.length <= 2 ? undefined : arguments[2];
                if ((arguments.length <= 3 ? undefined : arguments[3]) === false) multi = false;
              } else {
                callback = arguments.length <= 1 ? undefined : arguments[1];
                conditions = '';
                if ((arguments.length <= 2 ? undefined : arguments[2]) === false) multi = false;
              }

              var text = element.textContent;

              var moraf = new Moraf({
                type: TEXT,
                element: element,
                conditions: conditions,
                callback: callback,
                text: text
              });

              return moraf;
            }

            /** @type {boolean} - Turns debugging messages on or off. */

          }, {
            key: 'stats',


            /** @type {Array.} - A stat message reporting total number of mutations tracked and animation frames requested,
            for easy insertion into the console without needing to turn debugging on. */
            value: function stats() {
              return ['Total mutations tracked:', _mutationCount, 'Total frames requested:', _rafCount];
            }
          }, {
            key: 'jQuery',
            get: function get() {
              return _jQ;
            },
            set: function set(obj) {
              if (isJQ(obj)) _jQ = obj;
              debug('jQuery library changed.');
            }
          }, {
            key: 'debug',
            set: function set(bool) {
              _debug = bool;
              console.info('[Moraf] Debugging is now ' + bool ? 'on.' : 'off.');
            }

            /** @type {number} - The total number of mutations or sets of mutations observed by all Moraf observers. */

          }, {
            key: 'mutationCount',
            get: function get() {
              return _mutationCount;
            }

            /** @type {number} - The total number of animation frames requested by all Moraf observers.
            Unless shims are being used or somethign is wrong, this should be the same as mutationCount. */

          }, {
            key: 'rafCount',
            get: function get() {
              return _rafCount;
            }
          }]);

          return Moraf;
        }();

        return Moraf;
      };

      /**
       * Extend the optimizely's utils singleton with additional methods
       */
      var extend = function extend() {
        var utils = window.optimizely.get('utils');
        var $ = window.optimizely.get('jquery');
        utils.Moraf = getMoraf($);
      };

      if (window.optimizely.initialized) {
        extend();
      } else {
        window.optimizely.push({
          'type': 'addListener',
          'filter': {
            'type': 'lifecycle',
            'name': 'initialized'
          },
          'handler': extend
        });
      }
    })();
  })();
} catch (e) {
  PJS.error('x/moraf-utils', e);
}

try {
  (function () {
    /*
      NTF Submissions Goal
      Authors: jared.schoen@crometrics.com, amanda.smith@crometrics.com
      Last Modified: 2/19/18
    
      Fires on submission of the NTF modal form around the site.
      Globalized from ABTST-155.
    */
    ;(function () {
      function initialized() {
        var $ = window.optimizely.get('jquery');

        $(document).on('submit', 'form[data-new-user-lightbox-form="true"]', function () {
          window.optimizely.push({ "type": "event", "eventName": "pjs_ntf_submissions" });
        });
      }

      // Wait for the optimizely initialized callback for Modules
      // that require jQuery.
      window.optimizely.push({
        type: "addListener",
        filter: {
          type: "lifecycle",
          name: "initialized"
        },
        handler: initialized
      });
    })();
  })();
} catch (e) {
  PJS.error('ntf-submissions', e);
}

try {
  (function () {
    /*
      [PJS] Crometrics Test Cookie
      Authors: 
        Matthew Tyree (matthew.tyree@crometrics.com)
        Matthew Gossage (matthew.gossage@crometrics.com)
      Last Modified: 06/13/2018
      Version: crometrics-test-cookie-1.0.0
    
      Track and persist the crometrics QA cookie if a given url param, or the cookie
      itself, is present.
    
      This cookie defaults to a lifetime of 15 minutes (renewed every time this module runs).
      The default for Optimizely QA links is 15 minutes, so that's what we're using here.
    */
    var COOKIE_NAME = "crometrics_test_cookie";
    var DISABLE_RE = /crometrics_test_cookie=false/;
    var ENABLE_RE = /crometrics_test_cookie=true/;

    var disable = DISABLE_RE.test(window.location.search);
    var enable = ENABLE_RE.test(window.location.search) || ENABLE_RE.test(window.document.cookie);

    // This will match if the cookie or enable query param are present.
    if (enable) {
      if (disable) {
        // If we've been told to disable it, then do so.
        window.document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      } else {
        // Otherwise, persist (or enable) the cookie.
        var date = new Date();
        date.setTime(date.getTime() + 15 * 60 * 1000);

        window.document.cookie = COOKIE_NAME + '=true; expires=' + date.toGMTString() + '; path=/';

        window.optimizely.push({
          type: "addListener",
          filter: { type: "analytics", name: "trackEvent" },
          handler: function handler(event) {
            PJS.log('Metric fired: ' + event.data.name + ' <' + event.data.apiName + '>');
          }
        });
      }
    }
  })();
} catch (e) {
  PJS.error('x/crometrics-test-cookie', e);
}

try {
  (function () {
    /*
    	Experiment: ABTST192 Helper
    	Authors: Matthew Tyree <matthew.tyree@crometrics.com>
    	Last Modified: 6/27/18
    
    	Opens the Request Syllabus modal on PDPs when the url hash is "#information-modal".
    	This doesn't work reliably with the client-supplied query param, so we're working
    	around it with this PJS module.
    */

    var PDP_URLS = ["/education/data-analytics", "/education/data-science", "/education/data-science-immersive", "/education/digital-marketing", "/education/front-end-web-development", "/education/javascript-development", "/education/learn-data-analysis-online", "/education/learn-digital-marketing-online", "/education/learn-html-css-web-design-online", "/education/learn-javascript-online", "/education/learn-user-experience-design-online", "/education/product-management", "/education/user-experience-design", "/education/user-experience-design-immersive", "/education/visual-design", "/education/web-development-immersive", "/education/web-development-immersive-remote"];

    function log(message) {
      if (/cro-debug=true/.test(window.location.search)) console.log("[PJS] [Experiment ABTST-192 Helper]: ", message);
    }

    function init() {
      log("Init");
      var elem = window.document.querySelector('a[href="#information-modal"]');

      if (elem) {
        // setImmediate()
        setTimeout(function () {
          log("Triggering modal.");
          elem.click();
        }, 0);
      }
    }

    // Check the pathname and hash before deciding to do anything.
    if (PDP_URLS.indexOf(window.location.pathname) >= 0 && window.location.hash === "#syllabus-modal") {
      log("Fix the back button.");
      history.replaceState({}, window.title, window.location.href.replace("#syllabus-modal", "#information-modal"));

      window.addEventListener("load", init);
    } else {
      log("URL check failed.");
    }
  })();
} catch (e) {
  PJS.error('exp-abtst192-helper', e);
}

window.optimizely = window.optimizely || [];

// Set email campaign visitor attribute
if (location.search.indexOf('utm_medium=email') > -1) {
  window.optimizely.push({
    "type": "user",
    "attributes": {
      "email_campaign_visitors": "Email Campaign Visitor"
    }
  });
}

if (location.pathname.indexOf('/findyourcourse') > -1) {
  window.optimizely.push({
    "type": "user",
    "attributes": {
      "find_your_course_viewers": "\"Find Your Course\" Viewer"
    }
  });
}