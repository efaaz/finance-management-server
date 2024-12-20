import mongoose, {Schema} from "mongoose";

const transectionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    type:{
        type: String,
        enum: ["income", "spending"],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    note: {
        type: String,
        default: "",
    },
});

export const transection = mongoose.model("Transection", transectionSchema);