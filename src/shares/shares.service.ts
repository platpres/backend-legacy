import { Logger, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ShareModel } from './shares.entity';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import * as nodemailer from 'nodemailer';
import * as aws from '@aws-sdk/client-ses';
import * as fs from 'fs';
import * as csv from 'csv-parser';

import { CardModel } from 'src/cards/cards.entity';
import { PresentationModel } from 'src/presentations/presentations.entity';
import { ContactModel } from 'src/contacts/contacts.entity';
import { SesEmailOptions } from '@nextnm/nestjs-ses';
import { ShareContactModel } from './shares-contact.entity';
import { ShareContactMessageModel } from './shares-contact-message.entity';
import { ConfigService } from '@nestjs/config';
import { userInfo } from 'os';
import { UserModel } from 'src/users/users.entity';

let email_tmpl = '';
    
fs.readFile('./src/template.html', 'utf8', (err, data) => {
    if (err) {
        throw err;
    }
    email_tmpl = data;
});

@Injectable()
export class SharesService {
    private readonly logger = new Logger(SharesService.name);
    ses: any;
    transporter: any;

    constructor(
        @InjectRepository(ShareModel)
        private shareRepository: Repository<ShareModel>,
        @InjectRepository(ShareContactModel)
        private shareContactRepository: Repository<ShareContactModel>,
        @InjectRepository(ShareContactMessageModel)
        private shareContactMessageRepository: Repository<ShareContactMessageModel>,
        private configService: ConfigService,
    ) {
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

    async getMetrics(userId: number): Promise<any> {
        const sentCount = await this.shareContactRepository.count({
            userId,
            state: 'sent'
        });

        const rejectedCount = await this.shareContactRepository.count({
            userId,
            state: 'rejected'
        });

        const acceptedCount = await this.shareContactRepository.count({
            userId,
            state: 'accepted'
        });

        return {
            sent: sentCount,
            rejected: rejectedCount,
            accepted: acceptedCount,
        };
    }

    async findAll(userId: number): Promise<ShareModel[]> {
        return await this.shareRepository.createQueryBuilder('share')
            .where('share.userId = :userId', {userId}).getMany();
    }

    async findSelfShare(uuid: string, presentationId: number): Promise<ShareModel> {
        const res = await this.shareRepository.createQueryBuilder('share')
            .where('share.selfShareUuid = :uuid and share.presentationId = :presentationId', {uuid, presentationId}).getMany();
        if (res && res.length) {
            return res[0];
        }
        return null;
    }

    async findOne(id: number): Promise<ShareModel> {
        return await this.shareRepository.findOne(id);
    }

    async create(entity: ShareModel): Promise<ShareModel> {
        entity.createdAt = new Date;
        return await this.shareRepository.save(entity);
    }

    async update(entity: ShareModel): Promise<UpdateResult> {
        return await this.shareRepository.update(entity.id, entity)
    }

    async delete(id): Promise<DeleteResult> {
        return await this.shareRepository.delete(id);
    }

    async createContact(entity: ShareContactModel): Promise<ShareContactModel> {
        return await this.shareContactRepository.save(entity);
    }

    async findDeals(userId: number, status: string, shareId: number): Promise<ShareContactModel[]> {
        if (status) {
            return await this.shareContactRepository.createQueryBuilder('share_contact')
            .leftJoinAndSelect('share_contact.share', 'share')
            .leftJoinAndSelect('share_contact.contact', 'contact')
            .where('share_contact.userId = :userId and share_contact.state == :status' +
                (shareId > -1 ? ' and share_contact.shareId == :shareId' : ''),
                {userId, status, shareId})
            .getMany();
        } else {
            return await this.shareContactRepository.createQueryBuilder('share_contact')
            .leftJoinAndSelect('share_contact.share', 'share')
            .leftJoinAndSelect('share_contact.contact', 'contact')
            .where('share_contact.userId = :userId and share_contact.state != "rejected"' +
                (shareId > -1 ? ' and share_contact.shareId == :shareId' : ''),
                {userId, shareId})
            .getMany();
        }
    }

    async findReceivedDeals(email: string): Promise<ShareContactModel[]> {
        return await this.shareContactRepository.createQueryBuilder('share_contact')
        .leftJoinAndSelect('share_contact.share', 'share')
        .leftJoinAndSelect('share_contact.contact', 'contact')
        .leftJoinAndSelect('share.card', 'card')
        .leftJoinAndSelect('card.avatar', 'avatar')
        .where('contact.email = :email',
            {email})
            .getMany();
    }

    async findDealMessages(userId: number, id: number): Promise<ShareContactMessageModel[]> {
        return await this.shareContactMessageRepository.createQueryBuilder('record')
            .leftJoinAndSelect('record.user', 'user')
            .where('record.userId = :userId and record.shareContactId = :id', {userId, id})
            .getMany();
    }

    async findDeal(userId: number, id: number): Promise<ShareContactModel> {
        return await this.shareContactRepository.createQueryBuilder('share_contact')
            .leftJoinAndSelect('share_contact.share', 'share')
            .leftJoinAndSelect('share_contact.contact', 'contact')
            .leftJoinAndSelect('share.card', 'card')
            .leftJoinAndSelect('card.avatar', 'avatar')
            .leftJoinAndSelect('share.presentation', 'presentation')
            .leftJoinAndSelect('presentation.questions', 'questions')
            .where('share_contact.id = :id', {id, userId})
            .getOne();

        // and share_contact.userId = :userId
    }

    async findAnonymousDeal(id: number): Promise<ShareContactModel> {
        return await this.shareContactRepository.createQueryBuilder('share_contact')
            .leftJoinAndSelect('share_contact.share', 'share')
            .leftJoinAndSelect('share_contact.contact', 'contact')
            .leftJoinAndSelect('share.card', 'card')
            .leftJoinAndSelect('card.avatar', 'avatar')
            .leftJoinAndSelect('share.presentation', 'presentation')
            .where('share_contact.id = :id', {id})
            .getOne();
    }

    async addMessage(entity: ShareContactMessageModel): Promise<ShareContactMessageModel> {
        return await this.shareContactMessageRepository.save(entity);
    }

    parseCsv(filepath): Promise<any> {
        let contacts = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(`./uploads/${filepath}`)
                .pipe(csv())
                .on('data', (data) => {
                    contacts.push(data);
                })
                .on('end', () => {
                    resolve(contacts);
                })
                .on('error', (reason) => {
                    reject(reason);
                });
        });
        
    }

    share(user: UserModel, share: ShareModel, card: CardModel, presentation: PresentationModel | any, contact: ContactModel, deal: ShareContactModel): void {
        if (share.selfShare) {
            return;
        }

        if (card && card.avatar) {
            card.videoGifUri = card.avatar.gifUri;
        }

        const appUrl = this.configService.get<string>('REDIRECT_FRONT_BASE_URL');
        const subject = presentation && presentation.id ? `::Platpres:: ${user.companyname ? user.companyname : user.name + ' ' + user.lastname} te ha compartido un negocio` :
            `::Platpres:: ${user.companyname ? user.companyname : user.name + ' ' + user.lastname} te ha compartido una tarjeta`;
        const resourceName = presentation && presentation.id ? `<h1 style="color: #3A5081">${presentation.title}</h1>`:
            '<h1 style="color: #3A5081">Te han compartido una Tarjeta:</h1>';

        const presentationHtml = presentation && presentation.id ? `<h2 style="color: #3A5081; font-size: 14px; margin-bottom: 24px">Video presentación enviada</h2>
        <a href="${appUrl}/app/presentation/${deal.id}" style="text-decoration: underline"><div style="width: 80%;margin-bottom: 36px; border-radius: 16px; min-height: 350px; background-size: cover; background-repeat: no-repeat; background-image: url('${presentation.thumbUri}')">
            <table style="width: 100%; text-align: center" role="presentation"><tbody><tr><td style="height: 144px;">&nbsp;</td></tr><tr><td><img src="https://platpres.com/assets/play-icon.png" style="width: 50px; height: 50px;" alt="play icon" border="0"></td></tr></tbody></table>
        </div></a>` : '';

        const attachmentHtml = share && share.pdfUri ? `<h2 style="color: #3A5081; font-size: 14px; margin-top: 24px; margin-bottom: 24px">Haz click en el siguiente botón para descargar el documento adjunto:</h2>
        <div style="width: 100%; text-align: center;margin-bottom: 36px;">
            <a href="${share.pdfUri}" target="_blank" style="padding: 16px;
            background: black;
            color: white;
            border-radius: 12px;
            text-decoration: none;">
                Descargar documento
            </a>
        </div>` : '';
        const logoSize = Math.round(140 * card.logoScale);
        const logoLeft = Math.round(145 * card.logoXPosition);
        const logoTop = Math.round(50 * card.logoYPosition);

        let htmlData = `${email_tmpl}`.replace(/%%videoUrl%%/g, card.videoGifUri)
                                      .replace(/%%logoUrl%%/g,  card.logoUri)
                                      .replace(/%%logoSize%%/g, logoSize.toString())
                                      .replace(/%%logoLeft%%/g, logoLeft.toString() + 'px')
                                      .replace(/%%logoTop%%/g, logoTop.toString() + 'px')
                                      .replace(/%%name%%/g, `${card.name} ${card.lnames}`)
                                      .replace(/%%position%%/g, card.position)
                                      .replace(/%%fontColor%%/g,  card.bgColor)
                                      .replace(/%%presentationHtml%%/g, presentationHtml)
                                      .replace(/%%resourceName%%/g, resourceName)
                                      .replace(/%%attachmentHtml%%/g, attachmentHtml)
                                      .replace(/%%seeMoreUrl%%/g, `${appUrl}/app/presentation/${deal.id}`);

        const options: SesEmailOptions = {
            from: 'info@platpres.com',
            to: contact.email,
            subject: subject,
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