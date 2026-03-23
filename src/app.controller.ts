import { Controller, Request, Res, Post, UseGuards, Get, HttpCode, HttpStatus, Body, UploadedFile, HttpException, UseInterceptors, Param, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsersService } from './users/users.service';
import { UserModel } from './users/users.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiNotFoundResponse, ApiOkResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Express } from 'express';
import *  as path from 'path';
import * as multer from 'multer';
import * as slug from 'slug';
import * as transcoderHelper from './cards/transcoder.helper';

@Controller()
export class AppController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  @UseGuards(LocalAuthGuard)
  @Post('api/login')
  async login(@Request() req) {
    const found = await this.usersService.findOne(req.user.username);

    if (found && found.activated !== true) {
      throw new HttpException({
        message: 'User not activated yet',
        errorCode: 11
      }, HttpStatus.UNAUTHORIZED);
    }
    return this.authService.login(req.user);
  }

  @Post('api/register')
  async register(@Request() req, @Body() user: UserModel) {
    const found = await this.usersService.findOne(user.username);

    if (found) {
      throw new HttpException({
        message: 'User already registered',
        errorCode: 15
      }, HttpStatus.BAD_REQUEST);
    }

    const newUser = await this.usersService.create(user);
    await this.usersService.sendActivationEmail(newUser);
    return {
      username: newUser.username,
      uuid: newUser.uuid,
      name: newUser.name,
      lastname: newUser.lastname,
    };
  }

  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
        destination: './uploads/pics/',
        filename: function ( req, file, cb ) {
            const timestamp = new Buffer(new Date().getTime().toString()).toString('base64');
            const fileo = path.parse(file.originalname);
            cb( null, slug(fileo.name + '-' + timestamp) + fileo.ext);
        },
    }),
}))
@Post('api/register/:uuid/profile')
@ApiOkResponse({ description: 'Profile pic uploaded successfully.'})
@ApiNotFoundResponse({ description: 'User not found.' })
@ApiUnprocessableEntityResponse({ description: 'Profile files not uploaded.' })
async uploadVideo(
    @Param('uuid', ParseIntPipe) uuid: number,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
) {
    const user =  await this.usersService.findOnebyUuid(uuid.toString());
    if (!user) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    }

    const response: any = await this.uploadRemotely(file.filename, user.uuid);
    user.profilePath = `files/${file.filename}`;
    user.profileUri = response.uri;
    return this.usersService.update(user);
}

  uploadRemotely = function(file, id) {
    var _file = './uploads/pics/' + file;
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

  @Post('api/recover')
  async recover(@Request() req, @Body() data: any) {
    const user = await this.usersService.findOne(data.email);

    if (!user) {
      return {
        message: 'success',
      };
    }

    await this.usersService.generateNewActivationCode(user);
    await this.usersService.sendRecoverEmail(user);

    return {
      message: 'success',
    };
  }

  @Post('api/setpwd')
  async setpwd(@Request() req, @Body() data: any) {
    const activationCode = data.ac;
    const password = data.password;
    const user = await this.usersService.findOnebyActivationCode(activationCode);

    if (!activationCode || !user) {
      throw new HttpException({
        message: 'Not valid code',
        errorCode: 12
      }, HttpStatus.BAD_REQUEST);
    }

    user.password = password;
    await this.usersService.setpwd(user);
    return this.authService.login(user);
  }

  @Post('api/activate')
  async activate(@Request() req, @Body() data: any) {
    const activationCode = data.ac;
    const user = await this.usersService.findOnebyActivationCode(activationCode);

    if (!activationCode || !user) {
      throw new HttpException({
        message: 'Not valid code',
        errorCode: 12
      }, HttpStatus.BAD_REQUEST);
    }

    user.activated = true;
    await this.usersService.update(user);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/validateIds')
  async validateIds(@Request() req, @Body() data: any) {
    const ids = data.ids;
    let notValidIds = [];

    for(let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const user = await this.usersService.findOnebyUuid(id);

      if (!user) {
        notValidIds.push(id);
      }
    }
    
    return {
      'not_valid': notValidIds,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('api/logout')
  logout(@Request() req, @Res() res: Response) {
    res.clearCookie('jwt');
    res.send({
      msg: 'Successful logout',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.username);
    delete user.password;
    return user;
  }
}
