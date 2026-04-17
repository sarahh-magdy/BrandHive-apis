import { Schema , SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
    timestamps: true,
    discriminatorKey: 'role',
    toJSON: {
        virtuals: true
    }
})
export class Admin {
    readonly _id: Types.ObjectId;
    userName: string;
    email: string;
    password: string;
}
 
export const adminSchema = SchemaFactory.createForClass(Admin);