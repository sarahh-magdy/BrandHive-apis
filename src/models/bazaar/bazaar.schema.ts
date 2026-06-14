import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum BazaarStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

// ─── Bazaar = Seller's Store Page ─────────────────────────────────
@Schema({ timestamps: true })
export class Bazaar {
    @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
    readonly _id: Types.ObjectId;

    // ─── One bazaar per seller ────────────────────────────────────
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
    seller: Types.ObjectId;

    @Prop({ type: String, required: true, unique: true, trim: true })
    storeName: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    storeSlug: string;

    @Prop({ type: String, default: null })
    description: string | null;

    @Prop({ type: String, default: null })
    phone: string | null;

    @Prop({ type: String, default: null })
    whatsappLink: string | null;

    @Prop({ type: String, default: null })
    website: string | null;

    // ─── Store logo ───────────────────────────────────────────────
    @Prop({
        type: { url: String, publicId: String },
        default: null,
    })
    logo: { url: string; publicId: string } | null;

    // ─── Store banner ─────────────────────────────────────────────
    @Prop({
        type: { url: String, publicId: String },
        default: null,
    })
    banner: { url: string; publicId: string } | null;

    // ─── Featured categories ──────────────────────────────────────
    @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Category' }], default: [] })
    featuredCategories: Types.ObjectId[];

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    // ─── Approval status ──────────────────────────────────────────
    @Prop({
        type: String,
        enum: BazaarStatus,
        default: BazaarStatus.PENDING,
    })
    status: BazaarStatus;

    @Prop({ type: String, default: null })
    rejectionReason: string | null;

    // ─── Stats ────────────────────────────────────────────────────
    @Prop({
        type: {
            totalProducts: { type: Number, default: 0 },
            totalOrders: { type: Number, default: 0 },
            totalRevenue: { type: Number, default: 0 },
            averageRating: { type: Number, default: 0 },
            totalReviews: { type: Number, default: 0 },
        },
        default: () => ({
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0,
            averageRating: 0,
            totalReviews: 0,
        }),
    })
    stats: {
        totalProducts: number;
        totalOrders: number;
        totalRevenue: number;
        averageRating: number;
        totalReviews: number;
    };
}

export const BazaarSchema = SchemaFactory.createForClass(Bazaar);

BazaarSchema.index({ seller: 1 }, { unique: true });
BazaarSchema.index({ storeSlug: 1 }, { unique: true });
BazaarSchema.index({ storeName: 'text' });
BazaarSchema.index({ isActive: 1 });
BazaarSchema.index({ status: 1 });