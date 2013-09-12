'use strict';

var _ = require('lodash');
var http = require('http');
var url = require('url');

function error(msg) {
  throw new Error(msg);
}

/**
 * POSTs changes to livereload
 * @param {Object} thisoptions Matches to post to livereload
 *
 * each options.matches object src is matched against the filepath
 * if a match is found src is replaced with dest and filePathTransform called
 *
 *    var onWatchChangedFile = new LiveReloadChanges({
 *      matches: {
 *        css: {
 *          src: /\.scss$/,
 *          dest: '.css'
 *        },
 *        html: {
 *          src: /\.html\.js$/,
 *          dest: '.html'
 *        }
 *      },
 *      filePathTransform: function(filepath) {
 *        return filepath.replace('http://localhost:8000/', 'client/')
 *      }
 *   });
 *
 *   onWatchChangedFile('http://localhost:8000/assets/page.scss');
 *   -> POST http://localhost:35729/changed?files=client/assets/page.css
 *
 */
function LiveReloadChanges(options) {
  this.options = _.extend({
    filePathTransform: _.identity,
    liveReloadServer: 'http://localhost:35729'
  }, options);

  this.options.parsedServer = url.parse(this.options.liveReloadServer);

  if (!_.isObject(this.options.matches)) {
    error('no options.matches provded');
  }

  this.files = [];
}

var fn = LiveReloadChanges.prototype;

/**
 * POSTs the file changes to livereload:PORT/changes
 * @param  {String} changes
 */
fn.postChangesToLiveReload = function postChangesToLiveReload(changes) {
  if (!changes) return;

  var path = '/changed?files=' + changes;
  console.log('LiveReload changes: ' + changes);

  http.request({
    hostname: this.options.parsedServer.hostname,
    port: this.options.parsedServer.port,
    path: path,
    method: 'POST'
  }).on('error', function() {
    console.error(
      'Failed to update LiveReload with changes: ' + changes
    );
  }).end();
};

/**
 * @return {Function} Debounced function
 */
fn.onFileChange = _.debounce(function onFileChange() {
  this.postChangesToLiveReload(this.files.join(','));
  this.files.length = 0;
}, 200);

/**
 * Matches filepath to options.matches and triggers onFileChange
 * @param  {String} filepath
 */
fn.process = function process(filepath) {
  Object.keys(this.options.matches).map(function(matchType) {
    var match = this.options.matches[matchType];
    if (filepath.match(match.src)) {
      filepath = filepath.replace(match.src, match.dest);
      this.files.push(this.options.filePathTransform(filepath));
    }
  }, this);
  this.onFileChange();
};

module.exports = LiveReloadChanges;
