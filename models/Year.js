<<<<<<< HEAD
require("./dbConnect");
const YearSchema = new Schema(
=======
require('./dbConnect');
const YearSchema = new Schema({
  year: { type: String, default: '2020-21', required: true },
  modifiedAt: { type: Date },
  createdAt: { type: Date },
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });

YearSchema.index(
>>>>>>> development
  {
    year: 1,
    isActive: 1
  },
  {
    unique: true
  }
);
<<<<<<< HEAD

module.exports = mongoose.model("Year", YearSchema);
=======
module.exports = mongoose.model('Year', YearSchema);
>>>>>>> development
