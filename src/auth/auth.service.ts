import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateGoogleUser(details: {
    email: string;
    displayName: string;
  }): Promise<User> {
    console.log('Validating Google user:', details);
    let user = await this.usersService.findByEmail(details.email);

    if (!user) {
      console.log('Creating new user for Google auth:', details);
      user = await this.usersService.register(
        details.displayName,
        details.email,
        null
      );
    } else {
      console.log('Found existing user:', user);
    }

    return user;
  }

  async loginGoogle(
    user: User
  ): Promise<{ access_token: string; user: Partial<User> }> {
    console.log('Generating token for Google user:', user);
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    console.log('Generated token payload:', payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ access_token: string; user: Partial<User> }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password) {
      throw new UnauthorizedException('This account requires Google login');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
