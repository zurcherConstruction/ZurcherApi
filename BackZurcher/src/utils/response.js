module.exports = (res, statusCode, message, data = null) => {
  res.status(statusCode).json({
    status: statusCode < 400 ? 'success' : 'error',
    message,
    data,
  });
};