
export function generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const all = upper + lower + numbers;

    // Garantir pelo menos 1 de cada tipo
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    // Preencher o resto (total: 8 caracteres)
    for (let i = 0; i < 5; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Embaralhar
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
