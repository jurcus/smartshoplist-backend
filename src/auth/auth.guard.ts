import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common'; // Dodajemy import

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    console.log('AuthGuard - user:', user, 'info:', info, 'err:', err); // Log dla debugowania
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
