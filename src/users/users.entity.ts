import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserModel {
    @PrimaryGeneratedColumn()
    @ApiPropertyOptional({ type: Number })
    id?: number;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: String })
    name: string;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: String, default: '' })
    lastname: string;

    @Column({
        nullable: false,
    })
    @ApiProperty({ type: String })
    username: string;

    @Column({
        nullable: false,
    })
    @ApiProperty({ type: String })
    password: string;

    @Column({
        nullable: true,
    })
    @ApiProperty({ type: String })
    companyname: string;

    @Column({
        nullable: true,
    })
    @ApiProperty({ type: String })
    uuid: string;

    @Column({
        nullable: true,
        default: false,
    })
    @ApiProperty({ type: Boolean })
    initiated?: boolean;

    @Column({
        nullable: true,
        default: false,
    })
    @ApiProperty({ type: Boolean })
    activated?: boolean;

    @Column({
        nullable: true,
        default: '',
    })
    @ApiProperty({ type: String })
    activationCode?: string;

    @Column({
        nullable: true,
    })
    @ApiProperty({ type: Date })
    activationCodeExpiration?: Date;

    @Column({
        nullable: true,
    })
    @ApiProperty({ type: String })
    profilePath?: string;

    @Column({
        nullable: true,
    })
    @ApiProperty({ type: String })
    profileUri?: string;

    @Column({
        nullable: true,
        default: 3,
    })
    @ApiProperty({ type: Number })
    credits?: number;
  }