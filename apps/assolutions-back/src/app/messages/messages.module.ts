// // messages/messages.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { MessagesService } from './messages.services';
// import { MessagesController } from './messages.controller';

// @Module({
//   imports: [                                // pour appeler mailer
//     TypeOrmModule.forFeature([]), // juste les entités lues
//   ],
//   providers: [MessagesService],
//   controllers: [MessagesController],
// })
// export class MessagesModule {}
