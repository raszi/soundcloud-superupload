var
  connect = require('connect'),
  http    = require('http'),
  path    = require('path');

var
  progress = require('./middleware/progress'),
  uploadScreen = require('./upload_screen'),
  uploadHandler = require('./upload_handler');

var
  UPLOAD_PATH = '/upload',
  STATIC_DIR = path.join(__dirname, '..', 'public'),
  UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

var uploads = {};

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.static(STATIC_DIR))
  .use(connect.static(UPLOAD_DIR))
  .use(connect.cookieParser('secret')) // TODO secret
  .use(connect.session())

  .use(progress())
  .use(uploadScreen('/', UPLOAD_PATH))
  .use(uploadHandler(uploads, UPLOAD_PATH, UPLOAD_DIR));

http.createServer(app).listen(3000);
