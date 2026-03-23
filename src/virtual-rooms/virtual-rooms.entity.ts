import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserModel } from "src/users/users.entity";
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';

@Entity()
export class VirtualRoomModel {
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
  }