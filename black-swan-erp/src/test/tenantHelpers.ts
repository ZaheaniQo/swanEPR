import { handleTenantError, TenantError, TENANT_FRIENDLY_MESSAGE } from '../utils/tenantGuard';

export const simulateMissingTenant = (showToast: (message: string, type?: 'success' | 'error' | 'info') => void) => {
  const error = new TenantError();
  const message = handleTenantError(error, showToast);
  return { error, message: message || TENANT_FRIENDLY_MESSAGE };
};
