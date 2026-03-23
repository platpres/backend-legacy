import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PresentationModel } from './presentations.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { QuestionModel } from './questions.entity';

@Injectable()
export class PresentationsService {
    private readonly logger = new Logger(PresentationsService.name);

    constructor(
        @InjectRepository(PresentationModel)
        private presentationRepository: Repository<PresentationModel>,
        @InjectRepository(QuestionModel)
        private questionRepository: Repository<QuestionModel>
    ) {}

    async findAll(userId: number, isPublic: boolean): Promise<PresentationModel[]> {
        const isPublicStr = isPublic === true ? true : false;
        return await this.presentationRepository.createQueryBuilder('presentation')
            .leftJoinAndSelect('presentation.questions', 'questions')
            .where('presentation.userId = :userId and presentation.state <> "deleted" and presentation.public = :isPublicStr', {userId, isPublicStr}).getMany();
    }

    async findOneBasic(id: number): Promise<PresentationModel | undefined> {
        const results = await this.presentationRepository.createQueryBuilder('presentation')
            .where('presentation.id = :id', {id})
            .getMany();

        if (results && results.length) {
            return results[0];
        }
        return null;
    }

    async findOne(id: number): Promise<PresentationModel | undefined> {
        const results = await this.presentationRepository.createQueryBuilder('presentation')
            .leftJoinAndSelect('presentation.defaultCard', 'card')
            .leftJoinAndSelect('presentation.questions', 'questions')
            .where('presentation.id = :id', {id})
            .getMany();

        if (results && results.length) {
            return results[0];
        }
        return null;
    }

    async findOneQuestion(id: number): Promise<QuestionModel> {
        return await this.questionRepository.findOne(id);
    }

    async create(entity: PresentationModel): Promise<PresentationModel> {
        return await this.presentationRepository.save(entity);
    }

    async createQuestion(entity: QuestionModel): Promise<QuestionModel> {
        return await this.questionRepository.save(entity);
    }

    async updateQuestion(entity: QuestionModel): Promise<UpdateResult> {
        return await this.questionRepository.update(entity.id, entity)
    }

    async deleteQuestion(id): Promise<DeleteResult> {
        return await this.questionRepository.delete(id);
    }

    async update(entity: PresentationModel): Promise<UpdateResult> {
        return await this.presentationRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.presentationRepository.delete(id);
    }
}