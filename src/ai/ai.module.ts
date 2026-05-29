import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService], // علشان أي module تاني يقدر يستخدمه
})
export class AiModule {}