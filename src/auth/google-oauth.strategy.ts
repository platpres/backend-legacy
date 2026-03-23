import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import * as uuid from 'uuid-int';
import { randomBytes } from 'crypto';
import { RepositoryNotFoundError } from 'typeorm';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Put config in `.env`
      clientID: configService.get<string>('OAUTH_GOOGLE_ID'),
      clientSecret: configService.get<string>('OAUTH_GOOGLE_SECRET'),
      callbackURL: configService.get<string>('OAUTH_GOOGLE_REDIRECT_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const { id, name, emails } = profile;

    // Here a custom User object is returned. In the the repo I'm using a UsersService with repository pattern, learn more here: https://docs.nestjs.com/techniques/database
    const data = {
      provider: 'google',
      providerId: id,
      name: name.givenName,
      username: emails[0].value,
    };

    let user = await this.usersService.findOne(data.username);
    if (!user) {
        const generator = uuid(Math.ceil(10*Math.random() + 1));
        const _uuid = generator.uuid();
        user = await this.usersService.create({
            username: data.username,
            name: data.name,
            lastname: '',
            password: '',
            activated: true,
            companyname: '',
            uuid: _uuid.toString(),
        });
    }    

    return user;
  }
}