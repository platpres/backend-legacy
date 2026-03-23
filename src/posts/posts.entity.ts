import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PostModel {
    @PrimaryGeneratedColumn()
    @ApiPropertyOptional({ type: Number })
    id?: number;

    @Column()
    @ApiProperty({ type: String })
    title: string;

    @Column()
    @ApiProperty({ type: String })
    body: string;

    @Column()
    @ApiProperty({ type: String })
    category: string;
  }