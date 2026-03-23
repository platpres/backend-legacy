import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository, UpdateResult } from 'typeorm';
import { UserModel } from './users.entity';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid-int';
import * as fs from 'fs';
import * as aws from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { SesEmailOptions } from '@nextnm/nestjs-ses';

let email_tmpl = '';
let email_tmpl2 = '';
fs.readFile('./src/template-activation.html', 'utf8', (err, data) => {
    if (err) {
        throw err;
    }
    email_tmpl = data;
});

fs.readFile('./src/template-recover.html', 'utf8', (err, data) => {
    if (err) {
        throw err;
    }
    email_tmpl2 = data;
});

@Injectable()
export class UsersService {
    ses: any;
    transporter: any;

    constructor(@InjectRepository(UserModel)
        private userRepository: Repository<UserModel>,
        private configService: ConfigService) {
            this.ses = new aws.SES({
                apiVersion: '2010-12-01',
                region: 'us-east-1',
                credentials: {
                    secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
                    accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
                }
            });
    
            this.transporter = nodemailer.createTransport({
                SES: { ses: this.ses, aws }
            });
    }

    async setpwd(entity: UserModel): Promise<UserModel> {
        console.log(entity.password);
        const hash = await bcrypt.hash(entity.password, 10);
        console.log(hash);
        entity.password = hash;
        return await this.userRepository.save(entity);
    }
  
    async create(entity: UserModel): Promise<UserModel> {
        const generator = uuid(1);
        const _uuid = generator.uuid();
        const hash = await bcrypt.hash(entity.password, 10);
        
        entity.uuid = _uuid.toString();
        entity.password = hash;
        entity.activationCode = generator.uuid().toString();
        return await this.userRepository.save(entity);
    }

    async update(entity: UserModel): Promise<UpdateResult> {
        return await this.userRepository.update(entity.id, entity)
    }

    async findOne(username: string): Promise<UserModel | undefined> {
        const results = await this.userRepository.createQueryBuilder('user')
            .where('user.username = :username', {username}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }

    async findOnebyUuid(uuid: string): Promise<UserModel | undefined> {
        const results = await this.userRepository.createQueryBuilder('user')
            .where('user.uuid like :uuid', {uuid: `%${uuid}`}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }

    async findOnebyId(id: number): Promise<UserModel | undefined> {
        const result = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :id', {id: id}).getOne();
        return result;
    }

    async findOnebyActivationCode(ac: string): Promise<UserModel | undefined> {
        const results = await this.userRepository.createQueryBuilder('user')
            .where('user.activationCode like :ac', {ac: `%${ac}`}).getMany();
        if (results && results.length > 0) {
            return results[0];
        } else {
            return undefined;
        }
    }

    generateNewActivationCode(user: UserModel): Promise<UserModel | undefined> {
        const generator = uuid(1);
        user.activationCode = generator.uuid().toString();
        return this.userRepository.save(user);
    }

    sendActivationEmail(user: UserModel): void {
        const appUrl = this.configService.get<string>('REDIRECT_FRONT_BASE_URL');
        const activationUrl = `${appUrl}/activate?ac=${user.activationCode}`;
        let htmlData = `${email_tmpl}`.replace(/%%activationUrl%%/g, activationUrl);

        const options: SesEmailOptions = {
            from: 'info@platpres.com',
            to: user.username,
            subject: '::Platpres:: Bienvenido!!',
            html: htmlData,
            replyTo: 'noreply@platpres.com',
        };

        this.transporter.sendMail(options,
            (err, info) => {
                console.log(err || info);
            }
        );
    }

    sendRecoverEmail(user: UserModel): void {
        const appUrl = this.configService.get<string>('REDIRECT_FRONT_BASE_URL');
        const recoverUrl = `${appUrl}/recover?ac=${user.activationCode}`;
        let htmlData = `${email_tmpl2}`.replace(/%%recoverUrl%%/g, recoverUrl);

        const options: SesEmailOptions = {
            from: 'info@platpres.com',
            to: user.username,
            subject: '::Platpres:: Recuperación de contraseña',
            html: htmlData,
            replyTo: 'noreply@platpres.com',
        };

        this.transporter.sendMail(options,
            (err, info) => {
                console.log(err || info);
            }
        );
    }
}