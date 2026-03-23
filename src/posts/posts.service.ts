import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PostModel } from './posts.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';

@Injectable()
export class PostsService {
    private readonly logger = new Logger(PostsService.name);

    constructor(
        @InjectRepository(PostModel)
        private postRepository: Repository<PostModel>
    ) {}

    async findAll(): Promise<PostModel[]> {
        return await this.postRepository.find();
    }

    async findOne(id: number): Promise<PostModel> {
        return await this.postRepository.findOne(id);
    }

    async create(entity: PostModel): Promise<PostModel> {
        return await this.postRepository.save(entity);
    }

    async update(entity: PostModel): Promise<UpdateResult> {
        return await this.postRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.postRepository.delete(id);
    }
}