function errorHandler (err, req, res, next) {
  req.log.error(err.stack) // Log the error stack trace for debugging

  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message // Hide error details in production
  })
}

export default errorHandler
