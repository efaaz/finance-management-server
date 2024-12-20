import mongoose, {Schema} from "mongoose";

const categorySchema = new Schema(
    {
        categoryName: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        type: {
            type: String,
            enum: ["income", "spending"],
            required: [true, "Type is required"],
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {timestamps: true}
);

export const category = mongoose.model("Category", categorySchema);