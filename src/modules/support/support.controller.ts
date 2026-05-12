import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import {
    SendSupportMessageDto,
    AdminReplyDto,
    GetSupportMessagesDto,
    UpdateSupportStatusDto,
} from './dto/support.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';
import { Public } from '@common/decorators/public.decorator';

@Controller('support')
@UseGuards(AuthGuard, RolesGuard)
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    // ─── Public: anyone can send ───────────────────────────────────
    @Post()
    @Public()
    sendMessage(
        @Body() dto: SendSupportMessageDto,
        @User() user: any,
    ) {
        return this.supportService.sendMessage(dto, user?._id?.toString());
    }

    // ─── Admin only ────────────────────────────────────────────────

    @Get()
    @Auth(['Admin'])
    getAllMessages(@Query() query: GetSupportMessagesDto) {
        return this.supportService.getAllMessages(query);
    }

    @Get(':id')
    @Auth(['Admin'])
    getOne(@Param('id') id: string) {
        return this.supportService.getOne(id);
    }

    @Post(':id/reply')
    @Auth(['Admin'])
    replyToMessage(
        @Param('id') id: string,
        @Body() dto: AdminReplyDto,
        @User() user: any,
    ) {
        return this.supportService.replyToMessage(id, dto, user._id);
    }

    @Patch(':id/status')
    @Auth(['Admin'])
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateSupportStatusDto,
    ) {
        return this.supportService.updateStatus(id, dto);
    }

    @Delete(':id')
    @Auth(['Admin'])
    deleteMessage(@Param('id') id: string) {
        return this.supportService.deleteMessage(id);
    }
}