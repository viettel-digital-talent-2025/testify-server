import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { TokenService } from 'src/shared/services/token.service';
import { HashingService } from 'src/shared/services/hashing.service';
import { UserRepository } from 'src/user/user.repository';
import { TokenPayload } from 'src/shared/types/jwt.type';
import { RegisterDto, LoginDto } from './dtos/auth.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { MailService } from 'src/shared/services/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly hashingService: HashingService,
    private readonly userRepository: UserRepository,
    @InjectRedis() private readonly redisClient: Redis,
    private readonly mailService: MailService,
  ) {}

  async generateTokens(payload: TokenPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ]);
    return { accessToken, refreshToken };
  }

  async updateRefreshToken(refreshToken: string, userId: string) {
    if (refreshToken !== 'null') {
      try {
        const redisKey = `refreshToken:${refreshToken}`;
        const redisValue = userId;
        const redisExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
        await this.redisClient.set(redisKey, redisValue, 'EX', redisExpiry);
      } catch (error) {
        this.logger.error('Failed to update refresh token in Redis', error);
        throw new InternalServerErrorException(
          'Failed to update refresh token in Redis',
        );
      }
    }
  }

  async deleteRefreshToken(refreshToken: string) {
    const redisKey = `refreshToken:${refreshToken}`;
    await this.redisClient.del(redisKey);
  }

  async register(body: RegisterDto) {
    const { firstname, lastname, email, password } = body;
    const hashedPassword = await this.hashingService.hash(password);

    const userExist = await this.userRepository.existByEmail(email);
    if (userExist) throw new UnauthorizedException('Account already exists');

    const user = await this.userRepository.create(
      firstname,
      lastname,
      email,
      hashedPassword,
    );

    if (!user) throw new UnauthorizedException('Account already exists');

    const payload: TokenPayload = {
      userId: user.id,
      role: user.role,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);
    await this.updateRefreshToken(refreshToken, user.id);
    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async login(body: LoginDto) {
    const { email, password } = body;

    const user = await this.userRepository.getByEmail(email);
    if (!user) throw new UnauthorizedException('Account does not exist');

    if (!(await this.hashingService.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: TokenPayload = {
      userId: user.id,
      role: user.role,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);
    await this.updateRefreshToken(refreshToken, user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(refreshToken: string) {
    const redisKey = `refreshToken:${refreshToken}`;
    const redisValue = await this.redisClient.get(redisKey);
    if (!redisValue) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.deleteRefreshToken(refreshToken);
  }

  async refreshToken(refreshToken: string) {
    const redisKey = `refreshToken:${refreshToken}`;
    const [redisValue, payload] = await Promise.all([
      this.redisClient.get(redisKey),
      this.tokenService.verifyRefreshToken(refreshToken),
    ]);

    if (!redisValue || !payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens({
      userId: payload.userId,
      role: payload.role,
    });

    await Promise.all([
      this.updateRefreshToken(tokens.refreshToken, payload.userId),
      this.deleteRefreshToken(refreshToken),
    ]);

    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.getByEmail(email);
    if (!user) throw new UnauthorizedException('Account does not exist');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:${email}`;

    try {
      await this.redisClient.set(redisKey, otp, 'EX', 600); // 10 minutes expiry
      await this.mailService.sendPasswordResetEmail(email, otp);
    } catch (error) {
      this.logger.error('Failed to process password reset request', error);
      throw new InternalServerErrorException(
        'Failed to process password reset request',
      );
    }
  }

  async verifyOtp(email: string, otp: string) {
    const redisKey = `otp:${email}`;
    const storedOtp = await this.redisClient.get(redisKey);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP has expired or is invalid');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const user = await this.userRepository.getByEmail(email);
    if (!user) throw new UnauthorizedException('Account does not exist');

    await this.verifyOtp(email, otp);

    if (newPassword !== confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }

    const hashedPassword = await this.hashingService.hash(newPassword);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    const redisKey = `otp:${email}`;
    await this.redisClient.del(redisKey);
  }
}
