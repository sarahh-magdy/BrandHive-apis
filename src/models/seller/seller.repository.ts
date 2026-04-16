import { Injectable } from "@nestjs/common";
import { AbstractRepository } from "../abstract.repository";
import { Seller } from "./seller.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class SellerRepository extends AbstractRepository<Seller> {
    constructor(@InjectModel(Seller.name) sellerModel: Model<Seller>) {
        super(sellerModel);
    }
}