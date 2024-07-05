require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const XviFcForm1TabsSchema = new Schema({
    label: {
        type: String,
        required: [true, "Tab label is required."]
    },
    id: {
        type: String,
        unique: true,
    },
    key: {
        type: String,
        default: ""
    },
    icon: {
        type: String,
        default: ""
    },
    displayPriority: {
        type: Number,
    },
    formType: {
        type: String,
        default: ""
    }
})
module.exports = mongoose.model("XviFcForm1Tabs", XviFcForm1TabsSchema)