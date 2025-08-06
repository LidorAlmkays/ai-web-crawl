import * as crypto from 'crypto';
import { IHashPort } from '../ports/hash.port';

export class Sha256HashService implements IHashPort {
  generate(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
