import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
    timestamps: true,
    discriminatorKey: 'role',
    toJSON: {
        virtuals: true
    },
  
})
export class User {
    readonly _id: Types.ObjectId;
    @Prop({type: String , required: true})
    userName: string;
    
    @Prop({type: String , required: true , unique: true})
    email: string;
    
    @Prop({type: String , required: true})
    password: string;
    
    @Prop({type: String})
    otp: string;
    
    @Prop({type: Date})
    otpExpiry: Date;

    @Prop({type: Boolean, default: false})
    isVerified: boolean;

    @Prop({type: Boolean, default: false})
    isConfirmed: boolean;
 }
 
export const userSchema = SchemaFactory.createForClass(User);
