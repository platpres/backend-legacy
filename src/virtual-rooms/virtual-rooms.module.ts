import { Module } from '@nestjs/common';
import { VirtualRoomsService } from './virtual-rooms.service';
import { VirtualRoomsController } from './virtual-rooms.controller';
import { VirtualRoomModel } from './virtual-rooms.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([VirtualRoomModel]),
    UsersModule,
  ],
  providers: [VirtualRoomsService],
  controllers: [VirtualRoomsController],
  exports: [VirtualRoomsService],
})
export class VirtualRoomsModule {}
