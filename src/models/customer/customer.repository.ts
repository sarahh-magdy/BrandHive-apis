import { Injectable } from "@nestjs/common";
import { AbstractRepository } from "../abstract.repository";
import { Customer } from "./customer.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class CustomerRepository extends AbstractRepository<Customer> {
    constructor(@InjectModel(Customer.name) private readonly customerModel: Model<Customer>) {
        super(customerModel);
    }
}