import { Inject } from '@nestjs/common';
import { Console, Command } from 'nestjs-console';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid-int';
import { CardsService } from 'src/cards/cards.service';

@Console()
export class SeedService {
  constructor(
    @Inject(UsersService) private usersService: UsersService,
    @Inject(CardsService) private cardsService: CardsService,
  ) {}

  @Command({
    command: 'seed',
    description: 'Seed DB',
  })
  async seed(): Promise<void> {
      // await this.seedUsers();
      await this.seedAvatars();
  }

  async seedUsers() {
      const pwd = 'platpres';
      const generator = uuid(1);
      const _uuid = generator.uuid();
      
      const hash = await bcrypt.hash(pwd, 10);
      await this.usersService.create({
        name: 'Juan Carlos',
        lastname: 'Mateus',
        username: 'info@platpres.com',
        password: hash,
        uuid: _uuid.toString(),
        companyname: 'Platpres',
      });
  }

  async seedAvatars() {
    const avatars = [{
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/24/alejandra-1-presentacion-mty2ntq0ntixmdi4mg.gif',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/24/alejandra-1-presentacion-mty2ntq0ntixmdi4mg.mp4',
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-presentacion-aleja.png',
      title: 'Presentación',
      order: 1,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-proveedores-aleja.png',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/13/tarjeta-2-mty1odc3ndq2mti3ng.mp4',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/13/tarjeta-2-mty1odc3ndq2mti3ng.gif',
      title: 'Proveedores',
      order: 2,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-cotizacion-aleja.png',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/14/tarjeta-3-mty1odc3ndcwntg5oq.mp4',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/14/tarjeta-3-mty1odc3ndcwntg5oq.gif',
      title: 'Cotización',
      order: 3,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-licitacion-aleja.png',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/15/tarjeta-4-mty1odc3nta4mtcymg.mp4',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/15/tarjeta-4-mty1odc3nta4mtcymg.gif',
      title: 'Licitación',
      order: 4,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-negocio-especial-aleja.png',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/12/tarjeta-1-mty1odc3ndm4ntexoq.mp4',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/12/tarjeta-1-mty1odc3ndm4ntexoq.gif',
      title: 'Negocio Especial',
      order: 5,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-presentacion-christian.png',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/20/tarjeta-1-presentacion-mty2ndi0mdkzntk1oq.gif',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/20/tarjeta-1-presentacion-mty2ndi0mdkzntk1oq.mp4',
      title: 'Presentación',
      order: 6,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-proveedores-christian.png',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/21/tarjeta-2-reg-proveedores-mty2ndi0mtewmti1na.gif',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/21/tarjeta-2-reg-proveedores-mty2ndi0mtewmti1na.mp4',
      title: 'Proveedores',
      order: 7,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-cotizacion-christian.png',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/22/tarjeta-3-cotizacion-mty2ndi0mtuzmdcymw.gif',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/22/tarjeta-3-cotizacion-mty2ndi0mtuzmdcymw.mp4',
      title: 'Cotización',
      order: 8,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-licitacion-christian.png',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/23/tarjeta-4-licitacion-mty2ndi0mtu5ntk0mg.gif',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/23/tarjeta-4-licitacion-mty2ndi0mtu5ntk0mg.mp4',
      title: 'Licitación',
      order: 9,
    }, {
      thumbUri: 'https://s3.amazonaws.com/platpres-digital2/public/undefined/thumb-negocio-especial-christian.png',
      gifUri: 'https://s3.amazonaws.com/platpres-digital2/public/24/tarjeta-5negocio-especial-mty2ndi0mty4ntcxna.gif',
      videoUri: 'https://s3.amazonaws.com/platpres-digital2/public/24/tarjeta-5negocio-especial-mty2ndi0mty4ntcxna.mp4',
      title: 'Negocio Especial',
      order: 10,
    }];

    for(let i = 0; i < avatars.length; i++) {
      const avatar = avatars[i];
      await this.cardsService.createAvatar(avatar);
    }
  }
}