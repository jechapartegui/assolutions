import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // lit Authorization: Bearer xxx
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'CHANGE_ME_JE_SUIS_EN_CLAIR',
    });
  }

  // Ce que tu retournes ici va se retrouver dans req.user
  async validate(payload: any) {
  // Ici, payload = contenuDuJeton
  return {
    id: payload.sub,
    login: payload.login,
    // pas de projectId ici non plus
  };
}
}
