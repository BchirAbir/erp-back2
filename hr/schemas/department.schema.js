// schemas/department.schema.js
const Joi = require("joi");

const ALL_DEPARTMENTS = [
  "HR", "Marketing", "Online Sales", "Finance",
  "Commercial", "Stock", "Purchase", "Production", "Maintenance",
];

const createEmployeeSchema = Joi.object({
  name:       Joi.string().trim().min(2).max(100).required(),
  position:   Joi.string().trim().max(100).required(),
  status:     Joi.string().valid("Active", "On Leave", "Inactive").default("Active"),
  phone:      Joi.string().pattern(/^\d{8}$/).allow("").optional(),
  email:      Joi.string().email().allow("").optional(),
  salary:     Joi.number().min(0).default(0),
  matricule:     Joi.string().trim().max(50).allow("").optional(),
  cnssNumber:    Joi.string().trim().max(50).allow("").optional(),
  cin:           Joi.string().trim().max(20).allow("").optional(),
  address:       Joi.string().trim().max(200).allow("").optional(),
  qualification: Joi.string().trim().max(100).allow("").optional(),
  category:      Joi.string().trim().max(50).allow("").optional(),
  echelon:       Joi.string().trim().max(50).allow("").optional(),
  situation:     Joi.string().trim().max(100).allow("").optional(),
  familyStatus:  Joi.string().valid("", "C", "M", "D", "V").optional(),
  numChildren:   Joi.number().integer().min(0).default(0),
  hourlyRate:    Joi.number().min(0).default(0),
  joinedDate: Joi.date().iso().optional(),
  department: Joi.string().valid(...ALL_DEPARTMENTS).optional(),
});

const updateEmployeeSchema = Joi.object({
  name:       Joi.string().trim().min(2).max(100).optional(),
  email:      Joi.string().email().allow("").optional(),
  position:   Joi.string().trim().max(100).optional(),
  status:     Joi.string().valid("Active", "On Leave", "Inactive").optional(),
  phone:      Joi.string().pattern(/^\d{8}$/).allow("").optional(),
  salary:     Joi.number().min(0).optional(),
  matricule:     Joi.string().trim().max(50).allow("").optional(),
  cnssNumber:    Joi.string().trim().max(50).allow("").optional(),
  cin:           Joi.string().trim().max(20).allow("").optional(),
  address:       Joi.string().trim().max(200).allow("").optional(),
  qualification: Joi.string().trim().max(100).allow("").optional(),
  category:      Joi.string().trim().max(50).allow("").optional(),
  echelon:       Joi.string().trim().max(50).allow("").optional(),
  situation:     Joi.string().trim().max(100).allow("").optional(),
  familyStatus:  Joi.string().valid("", "C", "M", "D", "V").optional(),
  numChildren:   Joi.number().integer().min(0).default(0),
  hourlyRate:    Joi.number().min(0).default(0),
  joinedDate: Joi.date().iso().optional(),
  department: Joi.string().valid(...ALL_DEPARTMENTS).optional(),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema };