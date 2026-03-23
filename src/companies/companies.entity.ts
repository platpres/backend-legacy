import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserModel } from "src/users/users.entity";
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import { UserCompanyModel } from "./user-company.entity";

@Entity()
export class CompanyModel {
    @PrimaryGeneratedColumn()
    @ApiPropertyOptional({ type: Number })
    id?: number;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: Number })
    userId: number;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: String })
    name: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    nit: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    description: string;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: String })
    category: string;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: String })
    market: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    bussinessWith: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    partnerWith: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    logoPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    logoUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    portraitPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    portraitUri: string;

    @ManyToOne(type => UserModel)
    user: UserModel;

    @OneToMany(() => UserCompanyModel, (userCompany) => userCompany.company)
    subscribers: UserModel[]
  }