import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum StockChangeReason {
    ORDER_PLACED = 'order_placed',
    ORDER_CANCELED = 'order_canceled',
    MANUAL_ADD = 'manual_add',
    MANUAL_DEDUCT = 'manual_deduct',
    RETURN = 'return',
    INITIAL = 'initial',
}

@Schema({ timestamps: true })
export class StockLog {
    @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
    readonly _id: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
    product: Types.ObjectId;

    @Prop({ type: String, required: true })
    productName: string;

    // ─── Change amount (positive = added, negative = deducted) ─────
    @Prop({ type: Number, required: true })
    change: number;

    // ─── Stock before & after ──────────────────────────────────────
    @Prop({ type: Number, required: true })
    stockBefore: number;

    @Prop({ type: Number, required: true })
    stockAfter: number;

    @Prop({ type: String, enum: StockChangeReason, required: true })
    reason: StockChangeReason;

    // ─── Reference (order ID, etc.) ────────────────────────────────
    @Prop({ type: SchemaTypes.ObjectId, default: null })
    reference: Types.ObjectId | null;

    @Prop({ type: String, default: null })
    referenceModel: string | null;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
    changedBy: Types.ObjectId | null;

    @Prop({ type: String, default: null })
    note: string | null;
}

export const StockLogSchema = SchemaFactory.createForClass(StockLog);

StockLogSchema.index({ product: 1, createdAt: -1 });
StockLogSchema.index({ reason: 1 });
StockLogSchema.index({ reference: 1 });