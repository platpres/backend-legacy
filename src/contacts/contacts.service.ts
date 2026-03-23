import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ContactModel } from './contacts.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';

@Injectable()
export class ContactsService {
    private readonly logger = new Logger(ContactsService.name);

    constructor(
        @InjectRepository(ContactModel)
        private contactRepository: Repository<ContactModel>
    ) {}

    async findAll(userId: number): Promise<ContactModel[]> {
        return await this.contactRepository.createQueryBuilder('share')
            .where('share.userId = :userId', {userId}).getMany();
    }

    async findOne(id: number): Promise<ContactModel> {
        return  await this.contactRepository.findOne(id);
    }

    async create(entity: ContactModel): Promise<ContactModel> {
        return await this.contactRepository.save(entity);
    }

    async update(entity: ContactModel): Promise<UpdateResult> {
        return await this.contactRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.contactRepository.delete(id);
    }

    async findByEmail(email: string, userId: number): Promise<ContactModel | undefined> {
        const results = await this.contactRepository.createQueryBuilder('user')
            .where('user.email = :email and user.userId = :userId', {email, userId}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }

    async findByShortId(uuid: string, userId: number): Promise<ContactModel | undefined> {
        const results = await this.contactRepository.createQueryBuilder('user')
            .where('user.uuid = :uuid and user.userId = :userId', {uuid, userId}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }
}