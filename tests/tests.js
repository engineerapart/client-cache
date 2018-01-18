/* global QUnit, test, equal, asyncTest, start, define, module, require */

var startTests = function (ccache) {

  var originalConsole = window.console;

  QUnit.module('ccache', {
    setup: function() {
      // Reset localStorage before each test
      try {
        localStorage.clear();
      } catch(e) {} // eslint-disable-line no-empty
    },
    teardown: function() {
      // Reset localStorage after each test
      try {
        localStorage.clear();
      } catch(e) {} // eslint-disable-line no-empty
      window.console = originalConsole;
      ccache.enableWarnings(false);
    },
  });

  test('Testing set() and get() with string', function() {
    var key = 'thekey';
    var value = 'thevalue';
    ccache.set(key, value, 1 * 60 * 1000);
    if (ccache.supported()) {
      equal(ccache.get(key), value, 'We expect value to be ' + value);
    } else {
      equal(ccache.get(key), null, 'We expect null value');
    }
  });

  if (ccache.supported()) {

    test('Testing set() with non-string values', function() {
      var key, value;

      key = 'numberkey';
      value = 2;
      ccache.set(key, value, 3 * 60 * 1000);
      equal(ccache.get(key)+1, value+1, 'We expect incremented value to be ' + (value+1));

      key = 'numberstring';
      value = '2';
      ccache.set(key, value, 3 * 60 * 1000);
      equal(ccache.get(key), value, 'We expect number in string to be ' + value);

      key = 'arraykey';
      value = ['a', 'b', 'c'];
      ccache.set(key, value, 3 * 60 * 1000);
      equal(ccache.get(key).length, value.length, 'We expect array to have length ' + value.length);

      key = 'objectkey';
      value = {'name': 'Pamela', 'age': 26};
      ccache.set(key, value, 3 * 60 * 1000);
      equal(ccache.get(key).name, value.name, 'We expect name to be ' + value.name);
    });

    test('Testing remove()', function() {
      var key = 'thekey';
      ccache.set(key, 'bla', 2 * 60 * 1000);
      ccache.remove(key);
      equal(ccache.get(key), null, 'We expect value to be null');
    });

    test('Testing flush()', function() {
      localStorage.setItem('outside-cache', 'not part of ccache');
      var key = 'thekey';
      ccache.set(key, 'bla', 100 * 60 * 1000);
      ccache.flush();
      equal(ccache.get(key), null, 'We expect flushed value to be null');
      equal(localStorage.getItem('outside-cache'), 'not part of ccache', 'We expect localStorage value to still persist');
    });

    test('Testing setBucket()', function() {
      var key = 'thekey';
      var value1 = 'awesome';
      var value2 = 'awesomer';
      var bucketName = 'BUCKETONE';

      ccache.set(key, value1, 1 * 60 * 1000);
      ccache.setBucket(bucketName);
      ccache.set(key, value2, 1 * 60 * 1000);

      equal(ccache.get(key), value2, 'We expect "' + value2 + '" to be returned for the current bucket: ' + bucketName);
      ccache.flush();
      equal(ccache.get(key), null, 'We expect "' + value2 + '" to be flushed for the current bucket');
      ccache.resetBucket();
      equal(ccache.get(key), value1, 'We expect "' + value1 + '", the non-bucket value, to persist');
    });

    test('Testing setWarnings()', function() {
      window.console = {
        calls: 0,
        warn: function() { this.calls++; },
      };

      var longString = (new Array(10000)).join('s');
      var num = 0;
      while(num < 10000) {
        try {
          localStorage.setItem('key' + num, longString);
          num++;
        } catch (e) {
          break;
        }
      }
      localStorage.clear();

      for (var i = 0; i <= num; i++) {
        ccache.set('key' + i, longString);
      }

      // Warnings not enabled, nothing should be logged
      equal(window.console.calls, 0);

      ccache.enableWarnings(true);

      ccache.set('key' + i, longString);
      equal(window.console.calls, 1, 'We expect one warning to have been printed');

      window.console = null;
      ccache.set('key' + i, longString);
    });

    test('Testing quota exceeding', function() {
      var key = 'thekey';

      // Figure out this browser's localStorage limit -
      // Chrome is around 2.6 mil, for example
      var stringLength = 10000;
      var longString = (new Array(stringLength+1)).join('s');
      var num = 0;
      while(num < 10000) {
        try {
          localStorage.setItem(key + num, longString);
          num++;
        } catch (e) {
          break;
        }
      }
      localStorage.clear();
      // Now add enough to go over the limit
      var approxLimit = num * stringLength;
      var numKeys = Math.ceil(approxLimit/(stringLength+8)) + 1;
      var currentKey;
      var i = 0;

      for (i = 0; i <= numKeys; i++) {
        currentKey = key + i;
        ccache.set(currentKey, longString, (i+1) * 60 * 1000);
      }
      // Test that last-to-expire is still there
      equal(ccache.get(currentKey), longString, 'We expect newest value to still be there');
      // Test that the first-to-expire is kicked out
      equal(ccache.get(key + '0'), null, 'We expect oldest value to be kicked out (null)');

      // Test trying to add something thats bigger than previous items,
      // check that it is successfully added (requires removal of multiple keys)
      var veryLongString = longString + longString;
      ccache.set(key + 'long', veryLongString, (i+1) * 60 * 1000);
      equal(ccache.get(key + 'long'), veryLongString, 'We expect long string to get stored');

      // Try the same with no expiry times
      localStorage.clear();
      for (i = 0; i <= numKeys; i++) {
        currentKey = key + i;
        ccache.set(currentKey, longString);
      }
      // Test that latest added is still there
      equal(ccache.get(currentKey), longString, 'We expect value to be set');
    });

    // We do this test last since it must wait 1 minute
    asyncTest('Testing set() and get() with string and expiration', 1, function() {

      var key = 'thekey';
      var value = 'thevalue';
      var minutes = 1;
      ccache.set(key, value, minutes * 60 * 1000);
      setTimeout(function() {
        equal(ccache.get(key), null, 'We expect value to be null');
        start();
      }, 1000*60*minutes);
    });

    asyncTest('Testing set() and get() with string and expiration in a different bucket', 2, function() {

      var key = 'thekey';
      var value1 = 'thevalue1';
      var value2 = 'thevalue2';
      var minutes = 1;
      var bucket = 'newbucket';
      ccache.set(key, value1, minutes * 2 * 60 * 1000);
      ccache.setBucket(bucket);
      ccache.set(key, value2, minutes * 60 * 1000);
      setTimeout(function() {
        equal(ccache.get(key), null, 'We expect value to be null for the bucket: ' + bucket);
        ccache.resetBucket();
        equal(ccache.get(key), value1, 'We expect value to be ' + value1 + ' for the base bucket.');
        start();
      }, 1000*60*minutes);
    });

    asyncTest('Testing flush(expired)', function() {
      localStorage.setItem('outside-cache', 'not part of ccache');
      var unexpiredKey = 'unexpiredKey';
      var expiredKey = 'expiredKey';
      ccache.set(unexpiredKey, 'bla', 1 * 60 * 1000);
      ccache.set(expiredKey, 'blech', (1/60) * 60 * 1000 ); // Expire after one second

      setTimeout(function() {
        ccache.flushExpired();
        equal(ccache.get(unexpiredKey), 'bla', 'We expect unexpired value to survive flush');
        equal(ccache.get(expiredKey), null, 'We expect expired value to be flushed');
        equal(localStorage.getItem('outside-cache'), 'not part of ccache', 'We expect localStorage value to still persist');
        start();
      }, 1500);
    });

  }

  QUnit.start();
};

if (typeof module !== 'undefined' && module.exports) {

  var ccache = require('../ccache');
  require('qunit');
  startTests(ccache);
} else if (typeof define === 'function' && define.amd) {

  require.config({
    baseUrl: './',
    paths: {
      'qunit': 'qunit',
      'ccache': '../ccache',
    },
  });

  require(['ccache', 'qunit'], function (ccache, QUnit) { // eslint-disable-line no-unused-vars
    startTests(ccache);
  });
} else {
  // Assuming that ccache has been properly included
  startTests(ccache);
}