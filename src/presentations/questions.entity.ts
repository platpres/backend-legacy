import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PresentationModel } from "./presentations.entity";

@Entity()
export class QuestionModel {
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
    title: string;

    @Column({
    nullable: true,
    })
    @ApiProperty({ type: String })
    videoUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    videoPath: string;

    @Column()
    presentationId: number;

    @ManyToOne(type => PresentationModel, { cascade: true, onDelete: "CASCADE" })
    @JoinColumn({name: 'presentationId', referencedColumnName: 'id'})
    presentation: PresentationModel;
  }