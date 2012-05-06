var
  mu    = require('mu2'),
  path  = require('path'),
  url   = require('url'),
  pump  = require('util').pump,
  _     = require('underscore');

mu.root = path.join(__dirname, 'templates');

function _uuid() {
  var uuid = [];

  _.each([ 8, 4, 4, 12 ], function (limit) {
    var group = "";
    for (var i = 0; i < limit; i++) {
      group = group.concat(Math.floor(Math.random() * 16).toString(16));
    }

    uuid.push(group);
  });

  return uuid.join('-');
}

function UploadScreen(path, uploadPath) {
  return function (req, res, next) {
    if (req.url !== path) { return next(); }

    var parsed = url.parse(uploadPath, true);
    parsed.query.id = _uuid();

    var stream = mu.compileAndRender('index.html.mustache', {
      action: url.format(parsed)
    });
    pump(stream, res);
  };
}

module.exports = UploadScreen;
