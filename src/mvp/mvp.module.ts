import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller';
import { CallService } from './services/call.service';

@Module({
  controllers: [WebhookController],
  providers: [CallService],
})
export class MvpModule {}
