import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserModel } from "src/users/users.entity";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CompanyModel } from "./companies.entity";

@Entity()
export class UserCompanyModel {
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
    @ApiProperty({ type: Number })
    companyId: number;

    @Column({
        nullable: false,
        default: 'subscribed'
    })
    @ApiProperty({ type: String })
    state: string;

    @ManyToOne(type => CompanyModel)
    @JoinColumn({name: 'companyId', referencedColumnName: 'id'})
    company: CompanyModel;

    @ManyToOne(type => UserModel)
    @JoinColumn({name: 'userId', referencedColumnName: 'id'})
    user: UserModel;
  }