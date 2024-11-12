/**
 * A higher-order function that wraps an asynchronous route handler
 * and catches any errors that occur, passing them to the next middleware.
 *
 * @param {Function} fn - The asynchronous route handler to wrap.
 * @returns {Function} A new route handler that catches errors and passes them to the next middleware.
 */

const asyncHandler = (fn) =>  {
  return async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    res.status(err.code || 500).json({
      success: false,
      message: err.message,
    });
  }
};
};

export { asyncHandler };
