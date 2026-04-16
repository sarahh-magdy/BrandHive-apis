import { Injectable } from "@nestjs/common";
import { User } from "./user.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AbstractRepository } from "../abstract.repository";

@Injectable()
export class UserRepository extends AbstractRepository<User> {
    constructor(@InjectModel(User.name) userModel: Model<User>) {
        super(userModel);
    }
}