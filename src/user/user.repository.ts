import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAll() {
    try {
      return await this.prismaService.user.findMany({
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A unique constraint would be violated on User.',
        );
      }
    }
  }

  async getById(id: string) {
    return await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async existByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    return user !== null;
  }

  async getByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        password: true,
      },
    });
    return user;
  }

  async create(
    firstname: string,
    lastname: string,
    email: string,
    password: string,
  ) {
    try {
      const user = await this.prismaService.user.create({
        data: { firstname, lastname, email, password },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
        },
      });
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A unique constraint would be violated on User.',
        );
      }
    }
  }

  async update(id: string, email: string) {
    const user = await this.prismaService.user.update({
      where: { id },
      data: { email },
    });
    return user;
  }

  async delete(id: string) {
    const user = await this.prismaService.user.delete({
      where: { id },
    });
    return user;
  }

  async updatePassword(id: string, password: string) {
    try {
      return await this.prismaService.user.update({
        where: { id },
        data: { password },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to update password');
      }
      throw error;
    }
  }
}
