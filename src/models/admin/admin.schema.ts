import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AdminDocument = HydratedDocument<Admin>;

@Schema({
    timestamps: true,
    discriminatorKey: 'role',
    toJSON: { virtuals: true }
})
export class Admin {

    @Prop()
    userName: string;

    @Prop({ unique: true })
    email: string;

    @Prop()
    password: string;

    readonly _id: Types.ObjectId;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);