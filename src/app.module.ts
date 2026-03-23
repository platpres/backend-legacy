import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsModule } from './cards/cards.module';
import { PresentationsModule } from './presentations/presentations.module';
import { SharesModule } from './shares/shares.module';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SesModule } from '@nextnm/nestjs-ses';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsoleModule } from 'nestjs-console';
import { SeedService } from './console/seed.service';
import { ContactsModule } from './contacts/contacts.module';
import { ConfigModule } from '@nestjs/config';
import { GoogleOauthModule } from './auth/google-auth.module';
import { CompaniesModule } from './companies/companies.module';
import { VirtualRoomsModule } from './virtual-rooms/virtual-rooms.module';

@Module({
  imports: [
    ConsoleModule,
    PostsModule,
    CompaniesModule,
    VirtualRoomsModule,
    ContactsModule,
    CardsModule,
    PresentationsModule,
    SharesModule,
    MulterModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
    }),
    SesModule.forRoot({
      AKI_KEY: process.env.AWS_ACCESS_KEY_ID || '',
      SECRET: process.env.AWS_SECRET_ACCESS_KEY || '',
      REGION: process.env.AWS_REGION || 'us-east-1',
    }),
    AuthModule,
    GoogleOauthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
