// server/validation/joiSchemas.js
const Joi = require('joi');

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(25)
});

const objectId = Joi.string().hex().length(24);

const pendingVerificationsQuery = paginationSchema;

const getUserParams = Joi.object({
  id: objectId.required()
});

const adminVerifyBody = Joi.object({
  status: Joi.string().valid('verified', 'rejected').required(),
  note: Joi.string().max(1000).allow('', null)
});

const verifyIdentityBody = Joi.object({
  key: Joi.string().min(6).max(128).required()
  // file is validated separately (multer + file validator)
});

module.exports = {
  pendingVerificationsQuery,
  getUserParams,
  adminVerifyBody,
  verifyIdentityBody
};
