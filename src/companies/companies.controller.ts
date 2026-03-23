import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { CompanyModel } from './companies.entity';
import { CompaniesService } from './companies.service';
import { Express } from 'express';
import *  as path from 'path';
import * as multer from 'multer';
import * as slug from 'slug';
import * as transcoderHelper from '../cards/transcoder.helper';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserModel } from 'src/users/users.entity';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';

@Controller('api/companies')
@ApiTags('companies')
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService, private readonly usersService: UsersService,
        configService: ConfigService) {
        transcoderHelper.setCredentials(configService.get<string>('AWS_ACCESS_KEY_ID'),
                                        configService.get<string>('AWS_SECRET_ACCESS_KEY'));
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Companies retrieved successfully.'})
    public findAll(@Request() req): Promise<CompanyModel[]> {
        const user: any = req.user;
        return this.companiesService.findAll(user.userId);
    }

    @Get(':id/metrics')
    @UseGuards(JwtAuthGuard)
    @ApiUnprocessableEntityResponse({ description: 'Company title already exists.' })
    async getMetrics(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<any> {
        const user: any = req.user;
        const company = await this.companiesService.findOne(id);

        if (!company) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        return this.companiesService.getMetrics(id);
    }

    @Post(':id/subscribe')
    @UseGuards(JwtAuthGuard)
    @ApiUnprocessableEntityResponse({ description: 'Company title already exists.' })
    async subscribe(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<any> {
        const user: any = req.user;
        const company = await this.companiesService.findOne(id);

        if (!company) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        return this.companiesService.subscribe(id, user.userId);
    }

    @Post(':id/unsubscribe')
    @UseGuards(JwtAuthGuard)
    @ApiUnprocessableEntityResponse({ description: 'Company title already exists.' })
    async unsubscribe(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<any> {
        const user: any = req.user;
        const company = await this.companiesService.findOne(id);

        if (!company) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        return this.companiesService.unsubscribe(id, user.userId);
    }

    @Get('/search')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Companies retrieved successfully.'})
    public async search(@Request() req): Promise<any[]> {
        const bussinessWith = req.query.bussinessWith.split(',');
        const partnerWith = req.query.partnerWith.split(',');
        const results = await this.companiesService.search(req.query, bussinessWith, partnerWith);
        return results.filter((company: any) => {
            return company && company.user && company.user.uuid;
        }).map((company: any) => {
            return {
                name: company.name,
                id: company.user.uuid.slice(8),
                ref: company.room ? company.room.id : null,
            };
        });
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Company retrieved successfully.'})
    @ApiNotFoundResponse({ description: 'Company not found.' })
    public findOne(@Param('id', ParseIntPipe) id: number): Promise<CompanyModel> {
        return this.companiesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiCreatedResponse({ description: 'Company created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Company title already exists.' })
    async create(@Request() req, @Body() Company: CompanyModel): Promise<CompanyModel> {
        const user: any = req.user;
        const comp = await this.companiesService.findOnebyNit(Company.nit);

        if (Company.nit && comp) {
            throw new HttpException('Nit already exists', HttpStatus.BAD_REQUEST);
        }
        Company.bussinessWith = Company.bussinessWith ? Company.bussinessWith.toLowerCase() : Company.bussinessWith;
        Company.partnerWith = Company.partnerWith ? Company.partnerWith.toLowerCase() : Company.partnerWith;
        return this.companiesService.create({
            ...Company,
            userId: req.user.userId,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Company deleted successfully.'})
    @ApiNotFoundResponse({ description: 'Company not found.' })
    public delete(@Param('id', ParseIntPipe) id: number): void {  
        this.companiesService.delete(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Company updated successfully.'})
    @ApiNotFoundResponse({ description: 'Company not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Company title already exists.' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() Company: CompanyModel): Promise<any> {
        return this.companiesService.update({
            ...Company,
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
    @ApiOkResponse({ description: 'Company files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Company not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Company files not uploaded.' })
    async uploadLogo(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CompanyModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.companiesService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);

        card.logoPath = `files/${file.filename}`;
        card.logoUri = response.uri;
        return this.companiesService.update(card);
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
    @ApiOkResponse({ description: 'Company files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Company not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Company files not uploaded.' })
    async uploadProfile(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CompanyModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.companiesService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);
        card.logoPath = `files/${file.filename}`;
        card.logoUri = response.uri;
        return this.companiesService.update(card);
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
    @ApiOkResponse({ description: 'Company files uploaded successfully.'})
    @ApiNotFoundResponse({ description: 'Company not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Company files not uploaded.' })
    async uploadPortrait(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CompanyModel,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const card =  await this.companiesService.findOne(id);
        if (!card) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const response: any = await this.uploadRemotely(file.filename, card.id);
        card.portraitPath = `files/${file.filename}`;
        card.portraitUri = response.uri;
        return this.companiesService.update(card);
    }
}