import { compare, genSalt, hash } from 'bcrypt';

export class PasswordHelper {
  static async hashPassword(password): Promise<string> {
    const salt = await genSalt(10); // 10 rounds processing
    return await hash(password, salt);
  }

  static async validatePassword(password, passwordHashed): Promise<boolean> {
    return await compare(password, passwordHashed);
  }
}
