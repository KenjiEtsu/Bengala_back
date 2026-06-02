export type User = {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  password: {
    salt: string; // base64
    hash: string; // base64
  };
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  username: string;
};

export type RefreshTokenRecord = {
  id: string; // jti
  userId: string;
  createdAt: number;
  // hashed refresh token
  tokenHash: string; // base64
};
