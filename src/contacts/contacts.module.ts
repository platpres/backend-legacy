import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { ContactModel } from './contacts.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsModule } from 'src/cards/cards.module';
import { PresentationsModule } from 'src/presentations/presentations.module';

@Module({
  imports: [
    CardsModule,
    PresentationsModule,
    TypeOrmModule.forFeature([ContactModel]),
  ],
  providers: [ContactsService],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
