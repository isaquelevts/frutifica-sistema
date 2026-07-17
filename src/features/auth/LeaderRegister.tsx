import React from 'react';
import { Link } from 'react-router-dom';
import { Church, Ticket } from 'lucide-react';

/**
 * @deprecated Substituído por /convite/:token (ver features/invites).
 *
 * O fluxo antigo era público via orgId na URL e fazia 3 chamadas do browser:
 * register-leader → POST /api/cells → PUT /api/users/:id. As duas últimas exigem
 * autenticação, que o usuário recém-cadastrado não tinha — então o cadastro
 * sempre morria com 401, deixando um perfil de líder órfão, sem célula.
 *
 * Além disso o orgId não expira, não é revogável, e aparece em toda URL e
 * payload da API — qualquer um que o visse podia criar líderes na igreja.
 *
 * A rota continua montada só para não dar 404 em links que já circulam.
 * Pode ser removida quando não houver mais links antigos em uso.
 */
const LeaderRegister: React.FC = () => {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ticket size={32} />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Este link mudou</h1>
        <p className="text-muted-foreground mb-2">
          O cadastro de líderes agora é feito por um link de convite pessoal da sua igreja.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Peça ao responsável pela sua igreja um novo link de convite — ele gera em
          segundos no painel, em <strong>Convites de Líderes</strong>.
        </p>

        <Link
          to="/login"
          className="block w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm mb-4"
        >
          Já tenho conta — fazer login
        </Link>

        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Church size={16} />
          <span>Frutifica</span>
        </div>
      </div>
    </div>
  );
};

export default LeaderRegister;
