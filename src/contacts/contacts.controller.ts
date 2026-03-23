import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ContactModel } from './contacts.entity';
import { ContactsService } from './contacts.service';

@Controller('api/contacts')
@ApiTags('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'Shares retrieved successfully.'})
    public findAll(@Request() req): Promise<ContactModel[]> {
        const user: any = req.user;
        return this.contactsService.findAll(user.userId);
    }

    @Get(':id')
    @ApiOkResponse({ description: 'Share retrieved successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ContactModel | any> {
        return this.contactsService.findOne(id);
    }

    @Post()
    @ApiCreatedResponse({ description: 'Share created successfully.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    public create(@Body() Share: ContactModel): Promise<ContactModel> {
        return this.contactsService.create(Share);
    }

    @Delete(':id')
    @ApiOkResponse({ description: 'Share deleted successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    public delete(@Param('id', ParseIntPipe) id: number): void {  
        this.contactsService.delete(id);
    }

    @Patch(':id')
    @ApiOkResponse({ description: 'Share updated successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    async patch(@Param('id', ParseIntPipe) id: number, @Body() data: ContactModel): Promise<any> {
        const contact =  await this.contactsService.findOne(id);
        if (!contact) {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }

        const rsp = await this.contactsService.update({
            ...contact,
            ...data,
        });

        return rsp;
    }

    @Put(':id')
    @ApiOkResponse({ description: 'Share updated successfully.'})
    @ApiNotFoundResponse({ description: 'Share not found.' })
    @ApiUnprocessableEntityResponse({ description: 'Share title already exists.' })
    async update(@Param('id', ParseIntPipe) id: number, @Body() Share: ContactModel): Promise<any> {
        const rsp = await this.contactsService.update({
            ...Share,
            id
        });

        return rsp;
    }
}