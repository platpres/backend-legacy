import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CompanyModel } from './companies.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { UserCompanyModel } from './user-company.entity';

@Injectable()
export class CompaniesService {
    private readonly logger = new Logger(CompaniesService.name);

    constructor(
        @InjectRepository(CompanyModel)
        private cardRepository: Repository<CompanyModel>,
        @InjectRepository(UserCompanyModel)
        private userCompanyRepository: Repository<UserCompanyModel>,
    ) {}

    async search(filter: any, bussinessWith: any, partnerWith: any): Promise<CompanyModel[]> {
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
            `company.nit like "%${filter.searchValue}%" OR ` +
            `company.market like "%${filter.searchValue}%" OR ` +
            `company.category like "%${filter.searchValue}%" )`;
        }

        return await this.cardRepository.createQueryBuilder('company')
                                        .leftJoinAndSelect('company.user', 'user')
                                        .leftJoinAndMapOne("company.room", 'VirtualRoomModel', 'virtualRoom', 'user.id = virtualRoom.userId')
                                        .where(where).getMany();
    }

    async getMetrics(companyId: number): Promise<any> {
        const subscribers = await this.userCompanyRepository.createQueryBuilder('company')
            .where('company.companyId = :companyId and company.state = "subscribed"', {companyId}).getCount();
        const unsubscribers = await this.userCompanyRepository.createQueryBuilder('company')
            .where('company.companyId = :companyId and company.state = "unsubscribed"', {companyId}).getCount();
        return {
            subscribers: subscribers ? subscribers : 0,
            unsubscribers: unsubscribers ? unsubscribers : 0,
        };
    }

    async findAll(userId: number): Promise<CompanyModel[]> {
        return await this.cardRepository.createQueryBuilder('card')
            .where('card.userId = :userId', {userId}).getMany();
    }

    async findOne(id: number): Promise<CompanyModel> {
        return await this.cardRepository.findOne(id);
    }

    async findOnebyNit(nit: string): Promise<CompanyModel | undefined> {
        const results = await this.cardRepository.createQueryBuilder('user')
            .where('user.nit like :nit', {nit: `%${nit}`}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }

    async subscribe(companyId: number, userId: number): Promise<any> {
        const suscription = await this.userCompanyRepository.createQueryBuilder('userCompany')
            .where('userCompany.userId = :userId and userCompany.companyId = :companyId', {userId, companyId}).getOne();

        if (suscription) {
            if (suscription.state === 'subscribed') {
                return {
                    success: true,
                };
            } else {
                suscription.state = 'subscribed';
                await this.userCompanyRepository.save(suscription);
                return {
                    success: true,
                };
            }
        }

        const newSuscription: UserCompanyModel = {
            userId,
            companyId,
            user: null,
            company: null,
            state: 'subscribed',
        };

        await this.userCompanyRepository.save(newSuscription);
        return {
            sucess: true,
        };
    }

    async unsubscribe(companyId: number, userId: number): Promise<any> {
        const suscription = await this.userCompanyRepository.createQueryBuilder('userCompany')
            .where('userCompany.userId = :userId and userCompany.companyId = :companyId', {userId, companyId}).getOne();

        if (suscription) {
            if (suscription.state === 'unsubscribed') {
                return {
                    success: true,
                };
            } else {
                suscription.state = 'unsubscribed';
                await this.userCompanyRepository.save(suscription);
                return {
                    success: true,
                };
            }
        }

        const newSuscription: UserCompanyModel = {
            userId,
            companyId,
            user: null,
            company: null,
            state: 'unsubscribed',
        };

        await this.userCompanyRepository.save(newSuscription);
        return {
            sucess: true,
        };

        return {
            sucess: true,
        };
    }

    async create(entity: CompanyModel): Promise<CompanyModel> {
        return await this.cardRepository.save(entity);
    }

    async update(entity: CompanyModel): Promise<UpdateResult> {
        return await this.cardRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.cardRepository.delete(id);
    }
}