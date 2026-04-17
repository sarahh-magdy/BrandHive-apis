import { Injectable } from "@nestjs/common";
import { AbstractRepository } from "../abstract.repository";
import { Admin } from "./admin.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class AdminRepository extends AbstractRepository<Admin> {
    constructor(@InjectModel(Admin.name) adminModel: Model<Admin>) {
        super(adminModel);
    }
}