import { useAuth } from '../../core/auth/AuthContext';

/**
 * Retorna true se a organização do usuário logado está com status 'suspended'.
 * Use para desabilitar forms/botões de escrita em toda a aplicação.
 */
export const useIsSuspended = (): boolean => {
  const { organization } = useAuth();
  return organization?.subscriptionStatus === 'suspended';
};
