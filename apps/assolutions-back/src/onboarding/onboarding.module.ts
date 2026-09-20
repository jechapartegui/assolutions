import { Module } from '@nestjs/common';

import { AccessControlModule } from '../common/access-control.module';
import { MessageModule } from '../message/message.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AccessControlModule, MessageModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
