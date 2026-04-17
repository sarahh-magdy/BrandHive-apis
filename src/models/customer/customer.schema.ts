import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
    timestamps: true,
    toJSON: { virtuals: true }
})
export class Customer {
    readonly _id: Types.ObjectId;

    @Prop({ type: String }) 
    userName: string;

    @Prop({ type: String, required: true, unique: true }) 
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String }) 
    otp: string;

    @Prop({ type: Date })  
    otpExpiry: Date;

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;

    @Prop({ type: Date })
    dob: Date;



}
 
export const customerSchema = SchemaFactory.createForClass(Customer);