import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { VirtualRoomModel } from './virtual-rooms.entity';
import { VirtualRoomsService } from './virtual-rooms.service';
import { Express } from 'express';
import *  as path from 'path';
import * as multer from 'multer';
import * as slug from 'slug';
import * as transcoderHelper from '../cards/transcoder.helper';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { PresentationsService } from 'src/presentations/presentations.service';

@Controller('api/virtual-rooms')
@ApiTags('virtual-rooms')
export class VirtualRoomsController {
    constructor(private readonly virtualRoomsService: VirtualRoomsService,
        private readonly usersService: UsersService,
        configService: ConfigService) {
        transcoderHelper.setCredentials(configService.get<string>('AWS_ACCESS_KEY_ID'),
                                        configService.get<string>('AWS_SECRET_ACCESS_KEY'));
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'VirtualRooms retrieved successfully.'})
    public findAll(@Request() req): Promise<VirtualRoomModel[]> {
        const user: any = req.user;
        return this.virtualRoomsService.findAll(user.userId);
    }

    @Get('/search')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'VirtualRooms retrieved successfully.'})
    public async search(@Request() req): Promise<any[]> {
        const bussinessWith = req.query.bussinessWith.split(',');
        const partnerWith = req.query.partnerWith.split(',');
        const results = await this.virtualRoomsService.search(req.query, bussinessWith, partnerWith);
        return results.map((company) => {
            return {
                id: company.user.uuid.slice(8),
            };
        });
    }

    @Get(':id')
    @ApiOkResponse({ description: 'VirtualRoom retrieved successfully.'})
    @ApiNotFoundResponse({ description: 'VirtualRoom not found.' })
    public findOne(@Param('id', ParseIntPipe) id: number): Promise<VirtualRoomModel> {
        return this.virtualRoomsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'VirtualRoom created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'VirtualRoom title already exists.' })
    async create(@Request() req, @Body() VirtualRoom: VirtualRoomModel): Promise<VirtualRoomModel> {
        const user: any = req.user;
        return this.virtualRoomsService.create({
            ...VirtualRoom,
            userId: req.user.userId,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'VirtualRoom deleted successfully.'})
    @ApiNotFoundResponse({ description: 'VirtualRoom not found.' })
    public delete(@Param('id', ParseIntPipe) id: number): void {  
        this.virtualRoomsService.delete(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'VirtualRoom updated successfully.'})
    @ApiNotFoundResponse({ description: 'VirtualRoom not found.' })
    @ApiUnprocessableEntityResponse({ description: 'VirtualRoom title already exists.' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() VirtualRoom: VirtualRoomModel): Promise<any> {
        return this.virtualRoomsService.update({
            ...VirtualRoom,
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
    @ApiOkResponse({ description: 'VirtualRoom files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'VirtualRoom not found.' })
    @ApiUnprocessableEntityResponse({ description: 'VirtualRoom files not uploaded.' })
    async uploadLogo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: VirtualRoomModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.virtualRoomsService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);

        card.logoPath = `files/${file.filename}`;
        card.logoUri = response.uri;
        return this.virtualRoomsService.update(card);
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
    @Post(':id/profile')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'VirtualRoom files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'VirtualRoom not found.' })
    @ApiUnprocessableEntityResponse({ description: 'VirtualRoom files not uploaded.' })
    async uploadProfile(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: VirtualRoomModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.virtualRoomsService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);
        card.logoPath = `files/${file.filename}`;
        card.logoUri = response.uri;
        return this.virtualRoomsService.update(card);
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
    @Post(':id/portrait')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'VirtualRoom files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'VirtualRoom not found.' })
    @ApiUnprocessableEntityResponse({ description: 'VirtualRoom files not uploaded.' })
    async uploadPortrait(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: VirtualRoomModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card: any =  await this.virtualRoomsService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);
        card.portraitPath = `files/${file.filename}`;
        card.portraitUri = response.uri;
        delete card.company;
        return this.virtualRoomsService.update(card);
    }
}