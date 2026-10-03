// Shared by public booking and authenticated client associations.
export class ClientCredentialError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export function isDefinitiveClientCredentialError(error: unknown) {
  return error instanceof ClientCredentialError && (
    (error.status === 401 && error.code === "CLIENT_TOKEN_INVALID") ||
    (error.status === 410 && error.code === "CLIENT_TOKEN_EXPIRED") ||
    (error.status === 403 && error.code === "CLIENT_IDENTITY_UNAVAILABLE") ||
    (error.status === 422 && error.code === "CLIENT_MATCH_UNAVAILABLE")
  );
}
