import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CardModel } from "src/cards/cards.entity";
import { PresentationModel } from "src/presentations/presentations.entity";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class ShareModel {
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
    cardId: number;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Number })
    presentationId: number;

    @Column({
      nullable: false,
      default: 'created',
    })
    @ApiProperty({ type: String })
    state: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    csvPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    pdfPath: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    pdfUri: string;

    @Column({
      nullable: true,
      default: false
    })
    @ApiProperty({ type: Boolean })
    selfShare: boolean;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: String })
    selfShareUuid: string;

    @Column({
      nullable: true,
    })
    @ApiProperty({ type: Date })
    createdAt: Date;

    @ManyToOne(type => CardModel)
    card: CardModel;

    @ManyToOne(type => PresentationModel)
    presentation: PresentationModel;
  }