import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import *  as path from 'path';
import * as multer from 'multer';
import * as slug from 'slug';
import * as transcoderHelper from '../cards/transcoder.helper';
import { ShareModel } from './shares.entity';
import { SharesService } from './shares.service';
import { SesEmailOptions, SesService } from '@nextnm/nestjs-ses';
import { CardsService } from 'src/cards/cards.service';
import { PresentationsService } from 'src/presentations/presentations.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ContactModel } from 'src/contacts/contacts.entity';
import { ContactsService } from 'src/contacts/contacts.service';
import { ShareContactModel } from './shares-contact.entity';
import { ShareContactMessageModel } from './shares-contact-message.entity';
import { UsersService } from 'src/users/users.service';

@Controller('api/shares')
@ApiTags('shares')
export class SharesController {
    constructor(private readonly sharesService: SharesService,
        private cardsService: CardsService,
        private presentationsService: PresentationsService,
        private contactsService: ContactsService,
        private usersService: UsersService,
        private sesService: SesService) {}

    @Get('/metrics')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Shares metrics retrieved successfully.'})
    public metrics(@Request() req): Promise<any> {
        const user: any = req.user;
        return this.sharesService.getMetrics(user.userId);
    }

    @Get('/deals')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Shares retrieved successfully.'})
    public findDeals(@Request() req): Promise<ShareContactModel[]> {
        const status = req.query && req.query.status ? req.query.status : null;
        const shareId = req.query && req.query.shareId ? req.query.shareId : -1;
        const user: any = req.user;
        console.log(user.userId);
        return this.sharesService.findDeals(user.userId, status, shareId);
    }

    @Get('/received_deals')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Shares retrieved successfully.'})
    public findReceivedDeals(@Request() req): Promise<ShareContactModel[]> {
        const status = req.query && req.query.status ? req.query.status : null;
        const user: any = req.user;
        console.log(user);
        return this.sharesService.findReceivedDeals(user.username);
    }

    @Get('/deals/:id')
    @ApiOkResponse({ description: 'Shares retrieved successfully.'})
    public async findDeal(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<ShareContactModel> {
        const user: any = req.user;
        const deal = await this.sharesService.findDeal(user ? user.userId : null, id);
        if (deal && deal.share && deal.share.card) {
            const cards = await this.cardsService.findAll(deal.share.userId);
            const masterCard = cards && cards.length ? cards[0] : null;
            deal.share.card.logoUri = masterCard && masterCard.logoUri ? masterCard.logoUri : null;
            deal.share.card.logoPath = masterCard && masterCard.logoPath ? masterCard.logoPath : null;
        }
        return deal;
    }

    @Get('/deals/:id/messages')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Shares retrieved successfully.'})
    public findDealMessages(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<ShareContactMessageModel[]> {
        const user: any = req.user;
        return this.sharesService.findDealMessages(user.userId, id);
    }

    @Post('/deals/:id/message')
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Share created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    public addMessage(@Request() req, @Body() data: ShareContactMessageModel, @Param('id', ParseIntPipe) id: number): Promise<ShareContactMessageModel> {
        return this.sharesService.addMessage({
            userId: req.user.userId,
            shareContactId: id,
            message: data.message,
            createdAt: new Date,
            updatedAt: new Date,
            user: null,
        });
    }

    @Get('/:id')
    @ApiOkResponse({ description: 'Share retrieved successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ShareModel | any> {
        const share: ShareModel = await this.sharesService.findOne(id);

        const card =  await this.cardsService.findOne(share.cardId);
        const presentation =  await this.presentationsService.findOne(share.presentationId);

        return {
            ...share,
            card,
            presentation,
        };
    }

    @Post('/:id/deal')
    @ApiCreatedResponse({ description: 'Share created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    async deal(@Param('id', ParseIntPipe) id: number, @Body() data: any): Promise<any> {
        const deal = await this.sharesService.findAnonymousDeal(id);
        if (!deal) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        await this.sharesService.createContact({
            ...deal,
            state: 'accepted',
            ename: data.name,
            eemail: data.email,
            ewhatsapp: data.whatsapp,
            eidplatpres: data.idplatpres,
        });

        return {
            message: 'accepted',
        }
    }

    @Post('/:id/reject')
    @ApiCreatedResponse({ description: 'Share created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    async reject(@Param('id', ParseIntPipe) id: number, @Body() data: any): Promise<any> {
        const deal = await this.sharesService.findAnonymousDeal(id);
        if (!deal) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        await this.sharesService.createContact({
            ...deal,
            state: 'rejected',
        });

        return {
            message: 'rejected',
        }
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Shares retrieved successfully.'})
    public findAll(@Request() req): Promise<ShareModel[]> {
        const user: any = req.user;
        return this.sharesService.findAll(user.userId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Share created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    public create(@Request() req, @Body() share: ShareModel): Promise<ShareModel> {
        return this.sharesService.create({
            ...share,
            userId: req.user.userId,
        });
    }

    @Post('self-share')
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Share created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    public async selfCreate(@Request() req, @Body() share: ShareModel): Promise<ShareModel> {
        const presentation = await this.presentationsService.findOne(share.presentationId);

        if (!share.cardId) {
            const cards = await this.cardsService.findAll(presentation.userId);
            share.cardId = cards && cards.length ? cards[0].id : null;
        }

        const shareObj = await this.sharesService.findSelfShare(share.selfShareUuid, presentation.id);

        if (shareObj) {
            return shareObj;
        }

        return this.sharesService.create({
            ...share,
            userId: presentation.userId,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Share deleted successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    public delete(@Param('id', ParseIntPipe) id: number): void {  
        this.sharesService.delete(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Share updated successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    async patch(@Param('id', ParseIntPipe) id: number, @Request() req, @Body() Share: ShareModel | any): Promise<any> {
        let contactsIds: any = [];
        let contactsEmails: any = [];

        if (Share.contacts) {
            contactsIds = Object.assign([], Share.contacts);
            delete Share.contacts;
        }

        if (Share.contactsEmails) {
            contactsEmails = Object.assign([], Share.contactsEmails);
            delete Share.contactsEmails;
        }

        const share =  await this.sharesService.findOne(id);
        const userId = share.selfShare === true ? share.userId : req.user.userId;
        const owner = await this.usersService.findOnebyId(userId);

        if (!share) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        if (!owner) {
            throw new HttpException('Owner not found', HttpStatus.NOT_FOUND);
        }

        if (share.state === 'sending') {
            return {
                affected: 0,
            };
        }

        const rsp = await this.sharesService.update({
            ...Share,
            state: Share.state,
        });

        const card =  await this.cardsService.findOne(share.cardId);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const presentation =  share.presentationId ? await this.presentationsService.findOne(share.presentationId) : {};
        
        if (share.presentationId && !presentation) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        // TODO: Use subject/observable/emitter to deal with contacts one by one
        // which is necessary for escalability
        let contacts: any;
        if ((contactsIds && contactsIds.length === 0) && (contactsEmails && contactsEmails.length === 0)) {
            contacts = await this.sharesService.parseCsv(share.csvPath);
        } else {
            contacts = contactsIds;
        }

        if (contactsEmails && contactsEmails.length > 0) {
            contacts = contactsEmails.map(e => {
                return {...e, phone: ''};
            });
        }

        if (contacts.length > owner.credits) {
            throw new HttpException('No enough credits', HttpStatus.BAD_REQUEST);
        }

        owner.credits = owner.credits - contacts.length;
        await this.usersService.update(owner);

        for(let row of contacts) {
            let contact = null;
            let contactFoundByUuid = false;
            
            if (contactsIds && contactsIds.length ) {
                contact = await this.contactsService.findOne(row);

                if (!contact) {
                    contact = await this.contactsService.findByShortId(row, userId);
                    contactFoundByUuid = contact !== null;
                }
            } else {
                contact = await this.contactsService.findByEmail(row.email, userId);
            }

            if (!contact) {
                if (row && row.email) {
                    contact = await this.contactsService.create({
                        ...row,
                        id: null,
                        userId: userId,
                    });
                } else {
                    console.log('looking by uuid', row);
                    const user = await this.usersService.findOnebyUuid(row);
                    if (user) {
                        contact = await this.contactsService.create({
                            email: user.username,
                            name: user.name,
                            phone: '',
                            uuid: user.uuid,
                            userId: userId,
                        });

                        console.log('contact created:');
                        console.log(contact);
                    }
                }
            } else {
                delete row.id;
                await this.contactsService.update({
                    ...contact,
                    ...row,
                });

                contact = await this.contactsService.findOne(contact.id);
            }
            
            const deal: ShareContactModel = await this.sharesService.createContact({
                shareId: share.id,
                contactId: contact.id,
                state: 'sent',
                userId: userId,
                share: null,
                contact: null,
                user: null,
                ename: null,
                eemail: null,
                ewhatsapp: null,
                eidplatpres: null,
            });

            const cards =  await this.cardsService.findAll(userId);
            const masterCard = cards && cards.length ? cards[0] : null;

            if (masterCard) {
                card.name = masterCard.name;
                card.lnames = masterCard.lnames;
                card.email = masterCard.email;
                card.logoPath = masterCard.logoPath;
                card.logoUri = masterCard.logoUri;
            }

            const user = await this.usersService.findOne(req.user.username);
            await this.sharesService.share(user, share, card, presentation, contact, deal);
        }
        
        // this.sharesService.share(share, card, presentation, contact);
        return rsp;
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Share updated successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    async update(@Param('id', ParseIntPipe) id: number, @Body() Share: ShareModel): Promise<any> {
        const rsp = await this.sharesService.update({
            ...Share,
            id
        });

        return rsp;
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/contacts/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = path.parse(file.originalname);
                cb( null, fileo.name+ '-' + timestamp + fileo.ext);
            },
        }),
    }))
    @Post(':id/contacts')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadVideo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: ShareModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const share =  await this.sharesService.findOne(id);
        if (!share) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        share.csvPath = `contacts/${file.filename}`;

        // parse CSV to extract contacts
        // verify each of them to confirm if it must be created for the current user
        // associate the contact with the share by a intermediate table which will work to mark the deal as done, closed, ignored
        return this.sharesService.update(share);
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/pdfs/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = path.parse(file.originalname);
                cb( null, fileo.name+ '-' + timestamp + fileo.ext);
            },
        }),
    }))
    @Post(':id/pdf')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadPdf(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: ShareModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const share =  await this.sharesService.findOne(id);
        if (!share) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, share.id);
        share.pdfPath = `pdfs/${file.filename}`;
        share.pdfUri = response.uri;

        // parse CSV to extract contacts
        // verify each of them to confirm if it must be created for the current user
        // associate the contact with the share by a intermediate table which will work to mark the deal as done, closed, ignored
        return this.sharesService.update(share);
    }

    uploadRemotely = function(file, id) {
        var _file = './uploads/pdfs/' + file;
        var ext = path.extname(_file);
        var s3filepath = path.dirname(_file) + '/' + slug(path.basename(_file, ext)) + ext;

        return new Promise((resolve, reject) => {
            transcoderHelper.uploadToS3(_file, s3filepath, id).then((uri) => {
                resolve({uri, file});
            }).catch((reason) => {
                reject(reason);
            });
        });
    };
}