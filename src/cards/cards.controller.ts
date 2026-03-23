import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { CardModel } from './cards.entity';
import { CardsService } from './cards.service';
import { Express } from 'express';
import *  as path from 'path';
import * as multer from 'multer';
import * as slug from 'slug';
import * as transcoderHelper from './transcoder.helper';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserModel } from 'src/users/users.entity';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { AvatarModel } from './avatars.entity';

@Controller('api/cards')
@ApiTags('cards')
export class CardsController {
    constructor(private readonly CardsService: CardsService, private readonly usersService: UsersService,
        configService: ConfigService) {
        transcoderHelper.setCredentials(configService.get<string>('AWS_ACCESS_KEY_ID'),
                                        configService.get<string>('AWS_SECRET_ACCESS_KEY'));
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Cards retrieved successfully.'})
    public findAll(@Request() req): Promise<CardModel[]> {
        const user: any = req.user;
        return this.CardsService.findAll(user.userId);
    }

    @Get('avatars')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Avatars retrieved successfully.'})
    public findAllAvatars(@Request() req): Promise<AvatarModel[]> {
        return this.CardsService.findAllAvatars();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card retrieved successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    public findOne(@Param('id', ParseIntPipe) id: number): Promise<CardModel> {
        return this.CardsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Card created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Card title already exists.' })
    async create(@Request() req, @Body() Card: CardModel): Promise<CardModel> {
        const user: any = req.user;
        const _user = await this.usersService.findOne(user.username);

        if (_user && _user.initiated !== true) {
            _user.initiated = true;
            await this.usersService.update(_user);
        }
        return this.CardsService.create({
            ...Card,
            userId: req.user.userId,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card deleted successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    public delete(@Param('id', ParseIntPipe) id: number): void {  
        this.CardsService.delete(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card updated successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card title already exists.' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() Card: CardModel): Promise<any> {
        if (Card.avatarId) {
            Card.videoGifUri = null;
            Card.videoUri = null;
            Card.videoPath = null;
        }
        return this.CardsService.update({
            ...Card,
            id
        });
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/files/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = path.parse(file.originalname);
                cb( null, slug(fileo.name + '-' + timestamp) + fileo.ext);
            },
        }),
    }))
    @Post(':id/logo')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadLogo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CardModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.CardsService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);

        card.logoPath = `files/${file.filename}`;
        card.logoUri = response.uri;
        return this.CardsService.update(card);
    }

    uploadRemotely = function(file, id) {
        var _file = './uploads/files/' + file;
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

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/files/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = path.parse(file.originalname);
                cb( null, slug(fileo.name + '-' + timestamp) + fileo.ext);
            },
        }),
    }))
    @Post(':id/video')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadVideo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CardModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.CardsService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);
        const fname = path.basename(response.uri);
        const gifResponse: any = await transcoderHelper.generateGif('public/' + card.id + '/' + fname);

        card.videoPath = `files/${file.filename}`;
        card.videoUri = response.uri;
        card.videoGifUri = gifResponse.gifUri;
        card.avatarId = null;
        return this.CardsService.update(card);
    }
}