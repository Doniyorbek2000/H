import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [JwtModule.register({ global: true }), AuditModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
