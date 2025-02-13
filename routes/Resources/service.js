const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const User = require("../../models/User");

const getLineItems = async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const createLineItems = async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const createResource = async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const getResources = async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

module.exports = {
  createLineItems,
  getLineItems,
  createResource,
  getResources,
};
