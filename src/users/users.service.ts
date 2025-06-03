import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async register(
    name: string,
    email: string,
    password: string | null
  ): Promise<User> {
    console.log('Registering user with email:', email);
    console.log('Input password:', password);

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      console.log('User already exists:', email);
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create({ name, email });
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Hashed password:', hashedPassword);
      user.password = hashedPassword;
    }

    console.log('Created user object:', user);
    const savedUser = await this.usersRepository.save(user);
    console.log('Saved user:', savedUser);
    return savedUser;
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
