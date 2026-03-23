import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CardModel } from './cards.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { AvatarModel } from './avatars.entity';

@Injectable()
export class CardsService {
    private readonly logger = new Logger(CardsService.name);

    constructor(
        @InjectRepository(CardModel)
        private cardRepository: Repository<CardModel>,
        @InjectRepository(AvatarModel)
        private avatarRepository: Repository<AvatarModel>,
    ) {}

    async findAll(userId: number): Promise<CardModel[]> {
        return await this.cardRepository.createQueryBuilder('card')
            .leftJoinAndSelect('card.avatar', 'avatar')
            .where('card.userId = :userId and card.state <> "deleted"', {userId}).getMany();
    }

    async findAllAvatars(): Promise<AvatarModel[]> {
        return await this.avatarRepository.createQueryBuilder('avatar').getMany();
    }

    async createAvatar(entity: AvatarModel): Promise<AvatarModel> {
        return await this.avatarRepository.save(entity);
    }

    async findOne(id: number): Promise<CardModel> {
        const cards = await this.cardRepository.createQueryBuilder('card')
            .leftJoinAndSelect('card.avatar', 'avatar')
            .where('card.id = :id', {id}).getMany();

        return cards[0];
    }

    async create(entity: CardModel): Promise<CardModel> {
        return await this.cardRepository.save(entity);
    }

    async update(entity: CardModel): Promise<UpdateResult> {
        return await this.cardRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.cardRepository.delete(id);
    }
}