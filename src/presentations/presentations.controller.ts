import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import *  as path from 'path';
import * as multer from 'multer';
import * as slug from 'slug';
import { PresentationModel } from './presentations.entity';
import { PresentationsService } from './presentations.service';
import * as transcoderHelper from '../cards/transcoder.helper';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GoogleOauthGuard } from 'src/auth/google-oauth.guard';
import { QuestionModel } from './questions.entity';
import { VirtualRoomsService } from 'src/virtual-rooms/virtual-rooms.service';
import { CardsService } from 'src/cards/cards.service';

@Controller('api/presentations')
@ApiTags('presentations')
export class PresentationsController {
    constructor(private readonly presentationsService: PresentationsService,
        private cardsService: CardsService,
        private readonly virtualRoomsService: VirtualRoomsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Presentations retrieved successfully.'})
    public findAll(@Request() req): Promise<PresentationModel[]> {
        const user: any = req.user;
        return this.presentationsService.findAll(user.userId, req.query.public === 'true');
    }

    @Get('/by-virtual-room/:id')
    @ApiOkResponse({ description: 'Presentations retrieved successfully.'})
    public async findByVirtualRoom(@Param('id', ParseIntPipe) id: number): Promise<PresentationModel[]> {

        const virtualRoom = await this.virtualRoomsService.findOne(id);

        if (!virtualRoom) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
        return this.presentationsService.findAll(virtualRoom.userId, true);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Presentation retrieved successfully.'})
    @ApiNotFoundResponse({ description: 'Presentation not found.' })
    public async findOne(@Param('id', ParseIntPipe) id: number): Promise<PresentationModel> {
        const presentation = await this.presentationsService.findOne(id);

        if (presentation.defaultCard) {
            const cards = await this.cardsService.findAll(presentation.userId);
            const masterCard = cards && cards.length ? cards[0] : null;
            presentation.defaultCard.logoUri = masterCard && masterCard.logoUri ? masterCard.logoUri : null;
            presentation.defaultCard.logoPath = masterCard && masterCard.logoPath ? masterCard.logoPath : null;
        }
        return presentation;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Presentation created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Presentation title already exists.' })
    public create(@Request() req, @Body() presentation: PresentationModel): Promise<PresentationModel> {
        return this.presentationsService.create({
            ...presentation,
            userId: req.user.userId,
        });
    }

    @Post(':id/questions')
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Question created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Question already exists.' })
    public createQuestion(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() question: QuestionModel): Promise<QuestionModel> {
        return this.presentationsService.createQuestion({
            ...question,
            presentationId: id,
            userId: req.user.userId,
        });
    }

    @Put('questions/:id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Presentation updated successfully.'})
    @ApiNotFoundResponse({ description: 'Presentation not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Presentation title already exists.' })
    public updateQuestion(@Param('id', ParseIntPipe) id: number, @Body() question: QuestionModel): Promise<any> {
        return this.presentationsService.updateQuestion({
            ...question,
            id
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Presentation deleted successfully.'})
    @ApiNotFoundResponse({ description: 'Presentation not found.' })
    public delete(@Param('id', ParseIntPipe) id: number): void {  
        this.presentationsService.delete(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Question deleted successfully.'})
    @ApiNotFoundResponse({ description: 'Question not found.' })
    public deleteQuestion(@Param('id', ParseIntPipe) id: number): void {  
        this.presentationsService.deleteQuestion(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Presentation updated successfully.'})
    @ApiNotFoundResponse({ description: 'Presentation not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Presentation title already exists.' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() Presentation: PresentationModel): Promise<any> {
        delete Presentation.questions;
        return this.presentationsService.update({
            ...Presentation,
            id
        });
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
    @Post(':id/thumb')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadLogo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: PresentationModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const presentation =  await this.presentationsService.findOneBasic(id);
        if (!presentation) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, presentation.id);
        presentation.thumbPath = `files/${file.filename}`;
        presentation.thumbUri = response.uri;
        return this.presentationsService.update(presentation);
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/files/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = (path.parse(file.originalname));
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
        @Body() body: PresentationModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const presentation =  await this.presentationsService.findOneBasic(id);
        if (!presentation) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
        const response: any = await this.uploadRemotely(file.filename, presentation.id);
        presentation.videoPath = `files/${file.filename}`;
        presentation.videoUri = response.uri;
        return this.presentationsService.update(presentation);
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/files/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = (path.parse(file.originalname));
                cb( null, slug(fileo.name + '-' + timestamp) + fileo.ext);
            },
        }),
    }))
    @Post(':id/companyLogo')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadCompanyLogo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: PresentationModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const presentation =  await this.presentationsService.findOneBasic(id);
        if (!presentation) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
        const response: any = await this.uploadRemotely(file.filename, presentation.id);
        presentation.companyLogoPath = `files/${file.filename}`;
        presentation.companyLogoUri = response.uri;
        return this.presentationsService.update(presentation);
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/files/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = (path.parse(file.originalname));
                cb( null, slug(fileo.name + '-' + timestamp) + fileo.ext);
            },
        }),
    }))
    @Post(':id/background')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Card files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Card not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Card files not uploaded.' })
    async uploadBackground(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: PresentationModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const presentation =  await this.presentationsService.findOneBasic(id);
        if (!presentation) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
        const response: any = await this.uploadRemotely(file.filename, presentation.id);
        presentation.backgroundPath = `files/${file.filename}`;
        presentation.backgroundUri = response.uri;
        return this.presentationsService.update(presentation);
    }

    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: './uploads/files/',
            filename: function ( req, file, cb ) {
                const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
                const fileo = (path.parse(file.originalname));
                cb( null, slug(fileo.name + '-' + timestamp) + fileo.ext);
            },
        }),
    }))
    @Post('questions/:id/video')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Question files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Question not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Question files not uploaded.' })
    async uploadQuestionVideo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: PresentationModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const question =  await this.presentationsService.findOneQuestion(id);
        if (!question) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
        const response: any = await this.uploadRemotely(file.filename, question.id);
        question.videoPath = `files/${file.filename}`;
        question.videoUri = response.uri;
        return this.presentationsService.updateQuestion(question);
    }
}