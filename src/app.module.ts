import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { MvpModule } from './mvp/mvp.module';

@Module({
  imports: [MvpModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
