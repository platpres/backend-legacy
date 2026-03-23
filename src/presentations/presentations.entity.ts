import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CardModel } from "src/cards/cards.entity";
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinTable } from 'typeorm';
import { QuestionModel } from "./questions.entity";

@Entity()
export class PresentationModel {
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
    description: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    videoPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    thumbPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    videoUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    thumbUri: string;

    @Column({
      nullable: true,
      default: 'created',
    })
    @ApiProperty({ type: String })
    state: string;

    @Column({
      nullable: true,
      default: false,
    })
    @ApiProperty({ type: Boolean })
    public: boolean;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    defaultCardId: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    defaultBackgroundId: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    backgroundPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    backgroundUri: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    companyLogoPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    companyLogoUri: string;

    @Column({
      nullable: true,
      default: false,
    })
    @ApiProperty({ type: Boolean })
    extended: boolean;

    @OneToMany(() => QuestionModel, (question) => question.presentation, { eager: true })    
    questions: QuestionModel[];

    @ManyToOne(type => CardModel)
    defaultCard: CardModel;
  }