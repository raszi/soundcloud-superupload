var
  formidable = require('formidable'),
  parse      = require('url').parse;

var
  HttpError  = require('../http_error');

function Progress() {
  // TODO use timestamp based entries to prevent memory leak 
  var progresses = {};

  function _getProgress(req) {
    var
      parsed = parse(req.originalUrl, true),
      progressId = parsed.query['X-Progress-Id'];

    if (!progressId) { return; }

    var id = [ req.sessionID, progressId ].join('');

    var progress = progresses[id];
    if (typeof progress === 'undefined') {
      progress = { percent: 0 };
      progresses[id] = progress; 
    }

    return progress;
  }

  function _processPOST(req, res, next) {
    var form = new formidable.IncomingForm();

    req.form = {
      fields: {},
      files: {}
    };

    function _onData(data, name, val) {
      if (Array.isArray(data[name])) {
        data[name].push(val);
      } else if (data[name]) {
        data[name] = [data[name], val];
      } else {
        data[name] = val;
      }
    }

    if (req._progress) {
      // calculating the total progress
      form.on('progress', function _formProgress(bytesReceived, bytesExpected) {
        req._progress.percent = bytesReceived / bytesExpected;
      });

      // timeout or socket close
      form.on('aborted', function _aborted() {
        req._progress.error = 'Upload aborted';
      });

      // any other error
      form.on('error', function _formError(err) {
        req._progress.error = err;
        req.resume();
      });
    }

    form.on('field', function _fileReceived(name, value) {
      _onData(req.form.fields, name, value);
    });

    form.on('file', function _fileReceived(name, file) {
      _onData(req.form.files, name, file);
    });

    form.on('end', function _formEnd() {
      if (req._progress) {
        req._progress.done = true;
        req._progress.percent = 1;
      }

      next();
    });

    form.parse(req);
  }

  function _processGET(req, res, next) {
    if (!req.headers['x-requested-with'] || typeof req._progress === 'undefined') {
      return next();
    }

    if (req._progress.error) {
      return next(new HttpError(400, req._progress.error, true));
    }

    var response = new Buffer(JSON.stringify(req._progress));

    res.writeHead(200, {
      'Content-Type':   'application/json',
      'Content-Length': response.length
    });
    res.end(response);
  }

  return function _handle(req, res, next) {
    req._progress = _getProgress(req);

    switch (req.method.toUpperCase()) {
      case 'POST':
        return _processPOST(req, res, next);

      case 'GET':
        return _processGET(req, res, next);
    }
  };
}

module.exports = Progress;
