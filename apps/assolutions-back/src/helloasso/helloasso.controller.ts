import { Controller, Post } from '@nestjs/common';
import { HelloAssoService } from './helloasso.service';

@Controller('helloasso')
export class HelloAssoController {
  constructor(private readonly helloAssoService: HelloAssoService) {}

  @Post('test-checkout')
  async testCheckout() {
    return this.helloAssoService.createTestCheckout();
  }
}