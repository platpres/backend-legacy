import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VirtualRoomModel } from './virtual-rooms.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';

@Injectable()
export class VirtualRoomsService {
    private readonly logger = new Logger(VirtualRoomsService.name);

    constructor(
        @InjectRepository(VirtualRoomModel)
        private cardRepository: Repository<VirtualRoomModel>,
    ) {}

    async search(filter: any, bussinessWith: any, partnerWith: any): Promise<VirtualRoomModel[]> {
        bussinessWith = bussinessWith.filter(e => e && e.length);
        partnerWith = partnerWith.filter(e => e && e.length);
        let values = '';
        if (bussinessWith.length > 0) {
            values = bussinessWith.map(e => `company.bussinessWith like "%${e.toLowerCase()}%"`).join(' OR ');
        } else if (partnerWith.length > 0) {
            values = partnerWith.map(e => `company.partnerWith like "%${e.toLowerCase()}%"`).join(' OR ');
        }

        let where = values ? `(${values})` : '';
        if (filter.searchValue) {
            where += (where ? ' AND ' : '') + ` (company.name like "%${filter.searchValue}%" OR ` +
            `company.description like "%${filter.searchValue}%" OR ` +
            `company.market like "%${filter.searchValue}%" OR ` +
            `company.category like "%${filter.searchValue}%" )`;
        }

        return await this.cardRepository.createQueryBuilder('company')
                                        .leftJoinAndSelect('company.user', 'user')
                                        .where(where).getMany();
    }

    async findAll(userId: number): Promise<VirtualRoomModel[]> {
        return await this.cardRepository.createQueryBuilder('card')
        .leftJoinAndMapOne("card.company", 'CompanyModel', 'company', 'company.userId = card.userId')
            .where('card.userId = :userId', {userId}).getMany();
    }

    async findOne(id: number): Promise<VirtualRoomModel> {
        const results = await this.cardRepository.createQueryBuilder('room')
        .leftJoinAndMapOne("room.company", 'CompanyModel', 'company', 'company.userId = room.userId')
            .where('room.id = :id', {id}).getMany();
        return results && results.length ? results[0] : null;
    }

    async findOnebyNit(nit: string): Promise<VirtualRoomModel | undefined> {
        const results = await this.cardRepository.createQueryBuilder('user')
            .where('user.nit like :nit', {nit: `%${nit}`}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }

    async create(entity: VirtualRoomModel): Promise<VirtualRoomModel> {
        return await this.cardRepository.save(entity);
    }

    async update(entity: VirtualRoomModel): Promise<UpdateResult> {
        return await this.cardRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.cardRepository.delete(id);
    }
}