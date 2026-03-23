import { Test, TestingModule } from '@nestjs/testing';
import { VirtualRoomsController } from './virtual-rooms.controller';

describe('VirtualRoomsController', () => {
  let controller: VirtualRoomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualRoomsController],
    }).compile();

    controller = module.get<VirtualRoomsController>(VirtualRoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
