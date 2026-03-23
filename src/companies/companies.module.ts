import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompanyModel } from './companies.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { UserCompanyModel } from './user-company.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CompanyModel, UserCompanyModel]),
    UsersModule,
  ],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
