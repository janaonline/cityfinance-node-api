require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const XviFcForm1TabsSchema = new Schema({
    label: {
        type: String,
        required: [true, "Tab label is required."]
    },
    id: {
        unique: true,
        type: String,
        required: [true, "id is required."]
    },
    key: {
        type: String,
        default: ""
    },
    icon: {
        type: String,
        default: ""
    },
    text: {
        type: String,
        default: "",
    },
    displayPriority: {
        type: Number,
        required: [true, "Display priority is required."]
    },

})
module.exports = mongoose.model("XviFcForm1Tabs", XviFcForm1TabsSchema)