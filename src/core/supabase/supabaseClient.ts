/**
 * @deprecated Supabase foi removido. O backend agora é a API própria (core/api/client.ts).
 * Este stub existe apenas para que módulos legados ainda não migrados (consolidação,
 * importação, whatsapp) compilem. Qualquer uso em runtime lança erro.
 */
const handler: ProxyHandler<any> = {
    get() {
        throw new Error('Supabase foi removido deste projeto. Use a API (core/api/client.ts).');
    },
    apply() {
        throw new Error('Supabase foi removido deste projeto. Use a API (core/api/client.ts).');
    },
};

export const supabase: any = new Proxy(function () {}, handler);
