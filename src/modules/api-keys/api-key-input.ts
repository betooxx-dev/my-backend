export const API_KEY_SCOPES = ['blog:admin'] as const;

const API_KEY_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9 _:.-]*$/;

export interface ValidatedApiKeyCreateInput {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

export class ApiKeyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = ApiKeyInputError.name;
  }
}

export function parseBearerToken(
  header: string | string[] | undefined,
): string | undefined {
  if (typeof header !== 'string') return undefined;
  return /^Bearer ([^\s]+)$/.exec(header)?.[1];
}

export function validateApiKeyCreateInput(
  input: unknown,
): ValidatedApiKeyCreateInput {
  if (!isRecord(input)) throw new ApiKeyInputError('API key input is required');

  const { name, scopes, expiresInDays } = input;
  if (
    typeof name !== 'string' ||
    name.length < 3 ||
    name.length > 100 ||
    !API_KEY_NAME_PATTERN.test(name)
  ) {
    throw new ApiKeyInputError(
      'name must be 3-100 characters, start with a letter or number, and contain only letters, numbers, spaces, underscores, dashes, dots or colons',
    );
  }

  if (scopes !== undefined && !Array.isArray(scopes)) {
    throw new ApiKeyInputError('scopes must be an array');
  }

  const normalizedScopes: unknown[] = scopes ?? [];
  const seenScopes = new Set<string>();
  for (const scope of normalizedScopes) {
    if (
      typeof scope !== 'string' ||
      !API_KEY_SCOPES.includes(scope as (typeof API_KEY_SCOPES)[number])
    ) {
      throw new ApiKeyInputError(
        `scope must be one of: ${API_KEY_SCOPES.join(', ')}`,
      );
    }
    if (seenScopes.has(scope))
      throw new ApiKeyInputError('scopes must not contain duplicates');
    seenScopes.add(scope);
  }

  if (expiresInDays !== undefined) {
    if (
      typeof expiresInDays !== 'number' ||
      !Number.isSafeInteger(expiresInDays) ||
      expiresInDays < 1
    ) {
      throw new ApiKeyInputError('expiresInDays must be a positive integer');
    }
  }

  return {
    name,
    scopes: [...normalizedScopes] as string[],
    ...(typeof expiresInDays === 'number' ? { expiresInDays } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
