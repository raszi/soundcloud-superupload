var
  async   = require('async'),
  fs      = require('fs'),
  mu      = require('mu2'),
  url     = require('url'),
  path    = require('path'),
  pump    = require('util').pump,
  fs      = require('fs'),
  tmpFile = require('tmp').file,
  _       = require('underscore');

var
  HttpError  = require('./http_error');

mu.root = path.join(__dirname, 'templates');

function UploadHandler(uploads, uploadPath, uploadDir) {
  function _sendRedirect(res, location) {
    res.writeHead(302, {
      'Location': location
    });

    res.end('Redirecting to ' + location);
  }

  /**
   * Moving all files to the upload directory.
   */
  function _moveFiles(files, cb) {
    async.map(files, function (file, callback) {
      var destination;

      async.waterfall([

        // creates a temporary file in the upload directory
        function _createDestination(callback) {
          tmpFile({
            dir:      uploadDir,
            mode:     0644,
            prefix:   'upload-',
            postfix:  '',
            //postfix: path.extname(file.name)
            keep:    true
          }, callback);
        },

        function _closeHandler(newPath, fd, callback) {
          destination = newPath;
          fs.close(fd, callback);
        },

        // moves the source to the destination
        function _moveToDestination(callback) {
          fs.rename(file.path, destination, function _renameDone(err) {
            if (err) { return callback(err); }

            callback(null, {
              path: path.basename(destination),
              size: file.size,
              name: file.name
            });
          });
        }
      ], callback);

    }, cb);
  }

  function _handlePOST(req, res, next) {
    // store the upload
    uploads[req.upload.id] = req.upload;

    var handled;

    if (req.form.files) {
      var uploadedFiles = _.filter(_.values(req.form.files), function (file) {
        return file.size > 0;
      });

      // update the uploaded files
      if (uploadedFiles.length > 0) {
        _moveFiles(uploadedFiles, function _moveDone(err, movedFiles) {
          if (err) {
            handled = true;
            req.upload.error = err;

            return next(new HttpError(500, err, true));
          }

          Array.prototype.push.apply(req.upload.files, movedFiles);
        });
      }
    }

    if (req.form.fields.description) {
      req.upload.description = req.form.fields.description;
    }

    if (handled) { return; }

    if (req._progress) {
      res.writeHead(200);
      res.end('Uploaded');
      return;
    }

    // modify the URL add id
    req.parsedURL.query.id = req.upload.id;
    _sendRedirect(res, url.format(req.parsedURL));
  }

  function _handleGET(req, res, next) {
    if (_.isEmpty(req.upload)) { return next(); }

    // handle status request
    if (req.headers['x-requested-with']) {
      var response = new Buffer(JSON.stringify(req.upload));
      res.writeHead(200, {
        'Content-Type':   'application/json',
        'Content-Length': response.length
      });
      res.end(response);
      return;
    }

    var stream = mu.compileAndRender('result.html.mustache', req.upload);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    pump(stream, res);
  }

  return function _handle(req, res, next) {
    var parsed = url.parse(req.originalUrl, true);

    // unknown path, ignoring
    if (parsed.pathname !== uploadPath) {
      return next();
    }

    var id = parsed.query.id;
    if (typeof id === 'undefined') {
      return next(new HttpError(400, 'Invalid request, no upload id', true));
    }

    req.upload = uploads[id] || { id: id, files: [] };
    req.parsedURL = parsed;

    switch (req.method.toUpperCase()) {
      case 'POST':
        return _handlePOST(req, res, next);

      case 'GET':
        return _handleGET(req, res, next);

      default:
        next();
    }
  };
}

module.exports = UploadHandler;
