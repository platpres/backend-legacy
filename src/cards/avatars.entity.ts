import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AvatarModel {
    @PrimaryGeneratedColumn()
    @ApiPropertyOptional({ type: Number })
    id?: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    thumbUri: string;

    @Column({
    nullable: true,
    })
    @ApiProperty({ type: String })
    videoUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    gifUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    title: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    order: number;
  }