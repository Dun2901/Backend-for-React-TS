import bcrypt from 'bcryptjs';

export const hashToken = async (token: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
};

export const compareToken = async (token: string, hashedToken: string): Promise<boolean> => {
  return bcrypt.compare(token, hashedToken);
};
