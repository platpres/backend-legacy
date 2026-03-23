import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContactModel } from "src/contacts/contacts.entity";
import { UserModel } from "src/users/users.entity";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShareModel } from "./shares.entity";

@Entity()
export class ShareContactMessageModel {
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
    shareContactId: number;

    @Column({
      nullable: false,
    })
    @ApiProperty({ type: String })
    message: string;

    @CreateDateColumn({
        nullable: true,
        default: 'CURRENT_TIMESTAMP',
    })
    @ApiProperty({ type: Date })
    createdAt?: Date;

    @UpdateDateColumn({
        nullable: true,
        default: 'CURRENT_TIMESTAMP',
    })
    @ApiProperty({ type: Date })
    updatedAt?: Date;

    @ManyToOne(type => UserModel)
    user: UserModel;
  }