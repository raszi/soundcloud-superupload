function HttpError(status, message, nostack) {
  var error = new Error(message || 'Error');
  error.status = status || 500;

  // disable stack trace
  if (nostack) { error.stack = ''; }

  return error;
}

module.exports = HttpError;
