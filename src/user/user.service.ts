import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getAll() {
    return await this.userRepository.getAll();
  }

  async getById(id: string) {
    return await this.userRepository.getById(id);
  }
}
