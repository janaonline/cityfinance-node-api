const IndicatorLineItems = require("../../models/indicatorLineItems");
const Response = require("../../service").response;

const get = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};
    if (type) {
      Object.assign(query, { type });
    }
    let newData = await IndicatorLineItems.find(query);
    return Response.OK(res, newData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

const createUpdate = async (req, res) => {
  try {
    const { name, type, bulk } = req.body;
    if ((!name || !type) && !bulk)
      return Response.BadRequest(res, null, "name & type required");
    let newData = [];
    if (bulk) {
      bulk.forEach((val) => {
        let { name, type } = val;
        newData.push(
          IndicatorLineItems.findOneAndUpdate({ name, type }, val, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          })
        );
      });
      newData = await Promise.all(newData);
    } else {
      newData = await IndicatorLineItems.findOneAndUpdate(
        { name, type },
        data,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
    return Response.OK(res, newData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

module.exports = {
  get,
  createUpdate,
};
