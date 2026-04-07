// server/middleware/validateJoi.js
module.exports = function validateJoi(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'params' ? req.params : source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.details.map(d => d.message) });
    }
    if (source === 'params') req.params = value;
    else if (source === 'query') req.query = value;
    else req.body = value;
    next();
  };
};
