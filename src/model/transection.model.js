import mongoose, {Schema} from "mongoose";

const transactionSchema = new Schema({
    userId: {
        type: String,
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
    date: {
        type: Date,
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

export const Transaction = mongoose.model("Transaction", transactionSchema);