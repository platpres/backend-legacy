import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import { AvatarModel } from "./avatars.entity";

@Entity()
export class CardModel {
    @PrimaryGeneratedColumn()
    @ApiPropertyOptional({ type: Number })
    id?: number;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: Number })
    userId: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    cardName: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    name: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    lnames: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    position: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    website: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    email: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    cellphone: string;

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
    videoPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    videoUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    videoGifUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    iconColor: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    bgColor: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    barColor: string;

    @Column({
      nullable: true,
      default: 'created',
    })
    @ApiProperty({ type: String })
    state: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    logoScale: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    logoXPosition: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    logoYPosition: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    avatarId: number;

    @ManyToOne(type => AvatarModel)
    avatar: AvatarModel;
  }