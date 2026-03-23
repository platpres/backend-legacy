import { Module } from '@nestjs/common';
import { PresentationsService } from './presentations.service';
import { PresentationsController } from './presentations.controller';
import { PresentationModel } from './presentations.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionModel } from './questions.entity';
import { VirtualRoomsModule } from 'src/virtual-rooms/virtual-rooms.module';
import { CardsModule } from 'src/cards/cards.module';

@Module({
  imports: [
    VirtualRoomsModule,
    CardsModule,
    TypeOrmModule.forFeature([PresentationModel, QuestionModel]),
  ],
  providers: [PresentationsService],
  controllers: [PresentationsController],
  exports: [PresentationsService],
})
export class PresentationsModule {}
