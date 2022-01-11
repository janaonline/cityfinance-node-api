const Redis = require("redis");
const request = require("request");
const CONFIG = require("../config/app_config");
if (CONFIG.REDIS && CONFIG.REDIS.hasOwnProperty(process.env.ENV)) {
  url = CONFIG["REDIS"][process.env.ENV];
} else {
  console.log(process.env.ENV, "Env not supported");
  process.exit(process.env.ENV + " : Env not supported @redis.js");
}
let Client = Redis.createClient(url);

Client.on("connect", function () {
  console.log(process.env.ENV + " Redis Sever Connected");
});
Client.on("disconnect", function () {
  console.log("disconnected");
});
Client.on("error", function (err) {
  console.log("redis error", err);
});
Client.on("end", function () {
  console.log("redis end");
});
module.exports.Client = Client;
module.exports.get = function (key, cb) {
  Client.get(key, cb);
};
module.exports.del = function (key, cb) {
  Client.del(key, cb);
};
module.exports.set = function (key, data, expTime = 15920) {
  Client.set(key, data, "EX", expTime);
};
module.exports.resetDashboard = () => {
  let key = "dashboard|*";
  Client.keys(key, (err, data) => {
    if (err) {
      console.log("error", err);
    } else {
      let baseUrl = `http://127.0.0.1:${process.env.PORT}`;
      let urls = data
        .map((m) => {
          let d = "";
          if (m && m.split("|").length > 1) {
            let buff = Buffer.from(m.split("|")[1], "base64");
            d = buff.toString("utf-8");
          }
          return d;
        })
        .filter((f) => f);
      for (key of data) {
        try {
          Client.del(key, async () => {
            let url = "";
            if (key && key.split("|").length > 1) {
              let buff = Buffer.from(key.split("|")[1], "base64");
              url = buff.toString("utf-8").replace(/"/g, "");
              let d = await doGetRequest(baseUrl + url);
            }
          });
        } catch (e) {
          console.log("Exception", e.message);
        }
      }
    }
  });
};
function doGetRequest(url) {
  return new Promise((resolve, reject) => {
    request.get(url, (err, data, body) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports.getDataPromise = function (key) {
  return new Promise((resolve, reject) => {
    Client.get(key, (err, value) => {
      if (err) reject(err);
      resolve(value);
    });
  });
};
