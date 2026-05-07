import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductRepository } from '../../models/product/product.repository';
import { StockLogRepository } from '../../models/stock-log/stock-log.repository';
import { NotificationService } from '../notification/notification.service';
import {
    StockChangeReason,
} from '../../models/stock-log/stock-log.schema';
import { AdjustStockDto, GetStockLogsDto } from './dto/inventory.dto';

// ─── Config ───────────────────────────────────────────────────────
export const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class InventoryService {
    constructor(
        private readonly productRepository: ProductRepository,
        private readonly stockLogRepository: StockLogRepository,
        private readonly notificationService: NotificationService,
    ) { }

    // ════════════════════════════════════════════════════════════════
    // REDUCE STOCK (called on order creation)
    // ════════════════════════════════════════════════════════════════
    async reduceStock(
        productId: string,
        quantity: number,
        orderId: string,
        userId: string,
    ) {
        const product = await this.productRepository.getOne({
            _id: new Types.ObjectId(productId),
            isDeleted: false,
        });
        if (!product) throw new NotFoundException('Product not found');

        const currentStock = (product as any).stock;

        // ─── Prevent selling if out of stock ─────────────────────
        if (currentStock === 0) {
            throw new BadRequestException(
                `"${(product as any).name}" is out of stock`,
            );
        }

        if (currentStock < quantity) {
            throw new BadRequestException(
                `Only ${currentStock} units available for "${(product as any).name}"`,
            );
        }

        const newStock = currentStock - quantity;

        // ─── Update stock ─────────────────────────────────────────
        await this.productRepository.updateOne(
            { _id: new Types.ObjectId(productId) },
            { stock: newStock },
            { new: true },
        );

        // ─── Log stock change ─────────────────────────────────────
        await this.stockLogRepository.create({
            product: new Types.ObjectId(productId),
            productName: (product as any).name,
            change: -quantity,
            stockBefore: currentStock,
            stockAfter: newStock,
            reason: StockChangeReason.ORDER_PLACED,
            reference: new Types.ObjectId(orderId),
            referenceModel: 'Order',
            changedBy: new Types.ObjectId(userId),
            note: `Stock reduced for order`,
        });

        // ─── Low stock alert ──────────────────────────────────────
        if (newStock <= LOW_STOCK_THRESHOLD && newStock > 0) {
            await this.sendLowStockAlert(product, newStock);
        }

        // ─── Out of stock notification ────────────────────────────
        if (newStock === 0) {
            await this.sendOutOfStockAlert(product);
        }

        return newStock;
    }

    // ════════════════════════════════════════════════════════════════
    // RESTORE STOCK (called on order cancellation)
    // ════════════════════════════════════════════════════════════════
    async restoreStock(
        productId: string,
        quantity: number,
        orderId: string,
        userId: string,
    ) {
        const product = await this.productRepository.getOne({
            _id: new Types.ObjectId(productId),
            isDeleted: false,
        });
        if (!product) return; // silently skip if product deleted

        const currentStock = (product as any).stock;
        const newStock = currentStock + quantity;

        await this.productRepository.updateOne(
            { _id: new Types.ObjectId(productId) },
            { stock: newStock },
            { new: true },
        );

        await this.stockLogRepository.create({
            product: new Types.ObjectId(productId),
            productName: (product as any).name,
            change: quantity,
            stockBefore: currentStock,
            stockAfter: newStock,
            reason: StockChangeReason.ORDER_CANCELED,
            reference: new Types.ObjectId(orderId),
            referenceModel: 'Order',
            changedBy: new Types.ObjectId(userId),
            note: `Stock restored due to order cancellation`,
        });
    }

    // ════════════════════════════════════════════════════════════════
    // MANUAL STOCK ADJUSTMENT (Admin)
    // ════════════════════════════════════════════════════════════════
    async adjustStock(dto: AdjustStockDto, adminId: string) {
        const product = await this.productRepository.getOne({
            _id: new Types.ObjectId(dto.productId),
            isDeleted: false,
        });
        if (!product) throw new NotFoundException('Product not found');

        const currentStock = (product as any).stock;
        const newStock = currentStock + dto.change;

        if (newStock < 0) {
            throw new BadRequestException(
                `Cannot reduce stock below 0. Current stock: ${currentStock}`,
            );
        }

        await this.productRepository.updateOne(
            { _id: new Types.ObjectId(dto.productId) },
            { stock: newStock },
            { new: true },
        );

        await this.stockLogRepository.create({
            product: new Types.ObjectId(dto.productId),
            productName: (product as any).name,
            change: dto.change,
            stockBefore: currentStock,
            stockAfter: newStock,
            reason: dto.reason,
            reference: null,
            referenceModel: null,
            changedBy: new Types.ObjectId(adminId),
            note: dto.note ?? null,
        });

        // ─── Check alerts after manual adjustment ─────────────────
        if (newStock === 0) {
            await this.sendOutOfStockAlert(product);
        } else if (newStock <= LOW_STOCK_THRESHOLD) {
            await this.sendLowStockAlert(product, newStock);
        }

        return {
            message: 'Stock adjusted successfully',
            data: {
                productId: dto.productId,
                stockBefore: currentStock,
                stockAfter: newStock,
                change: dto.change,
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // GET STOCK LOGS (Admin)
    // ════════════════════════════════════════════════════════════════
    async getStockLogs(productId: string, query: GetStockLogsDto) {
        const { page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.stockLogRepository.findProductLogs(productId, { skip, limit }),
            this.stockLogRepository.countDocuments({
                product: new Types.ObjectId(productId),
            }),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    // ════════════════════════════════════════════════════════════════
    // GET ALL STOCK LOGS (Admin dashboard)
    // ════════════════════════════════════════════════════════════════
    async getAllStockLogs(query: GetStockLogsDto) {
        const { page = 1, limit = 20, reason } = query;
        const skip = (page - 1) * limit;
        const filter: Record<string, any> = {};
        if (reason) filter.reason = reason;

        const [data, total] = await Promise.all([
            this.stockLogRepository.findWithPagination(filter, { skip, limit }),
            this.stockLogRepository.countDocuments(filter),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    // ════════════════════════════════════════════════════════════════
    // GET LOW STOCK PRODUCTS (Admin)
    // ════════════════════════════════════════════════════════════════
    async getLowStockProducts(threshold = LOW_STOCK_THRESHOLD) {
        const products = await this.productRepository.getLowStockProducts(threshold);
        return {
            data: products,
            meta: {
                threshold,
                count: products.length,
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // GET OUT OF STOCK PRODUCTS (Admin)
    // ════════════════════════════════════════════════════════════════
    async getOutOfStockProducts(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.productRepository.getOutOfStockProducts({ skip, limit }),
            this.productRepository.countDocuments({ isDeleted: false, isActive: true, stock: 0 }),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    // ─── Private Helpers ──────────────────────────────────────────
    private async sendLowStockAlert(product: any, stock: number) {
        // ─── In-app notification to Admin ────────────────────────
        await this.notificationService.create({
            user: 'ADMIN', // يتبعت للـ admin — عدّل لو عندك admin ID ثابت
            type: 'stock_alert',
            title: '⚠️ Low Stock Alert',
            body: `"${product.name}" has only ${stock} unit(s) left (SKU: ${product.sku})`,
            data: {
                productId: product._id.toString(),
                productName: product.name,
                sku: product.sku,
                stock,
                threshold: LOW_STOCK_THRESHOLD,
            },
        });
    }

    private async sendOutOfStockAlert(product: any) {
        await this.notificationService.create({
            user: 'ADMIN',
            type: 'stock_alert',
            title: '🚫 Out of Stock',
            body: `"${product.name}" is now out of stock (SKU: ${product.sku})`,
            data: {
                productId: product._id.toString(),
                productName: product.name,
                sku: product.sku,
                stock: 0,
            },
        });
    }
}