export class TenantError extends Error {
  code = 'TENANT_REQUIRED';

  constructor(message = 'Workspace tenant is missing. Please sign in again.') {
    super(message);
    this.name = 'TenantError';
  }
}

export const TENANT_FRIENDLY_MESSAGE = 'Workspace tenant is missing. Please sign in again.';

export const isTenantError = (error: unknown): error is TenantError => {
  if (error instanceof TenantError) return true;
  const message = (error as any)?.message;
  return typeof message === 'string' && message.toLowerCase().includes('tenant');
};

export const handleTenantError = (
  error: unknown,
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void
) => {
  if (isTenantError(error)) {
    if (showToast) {
      showToast(TENANT_FRIENDLY_MESSAGE, 'error');
    }
    return TENANT_FRIENDLY_MESSAGE;
  }
  return null;
};
