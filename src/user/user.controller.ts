import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { TokenGuard } from 'src/auth/guards/token.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(TokenGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(Role.Admin)
  async getAll() {
    return await this.userService.getAll();
  }

  @Get(':id')
  @Roles(Role.User)
  async getById(@Param('id') id: string) {
    return await this.userService.getById(id);
  }
}
