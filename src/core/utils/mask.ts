export const maskPhone = (value: string) => {
    if (!value) return value;

    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 11 digits
    const sliced = digits.slice(0, 11);

    // Apply mask: (99) 99999-9999 or (99) 9999-9999
    if (sliced.length <= 2) {
        return sliced.replace(/^(\d{0,2})/, '($1');
    } else if (sliced.length <= 6) {
        return sliced.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    } else if (sliced.length <= 10) {
        return sliced.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
        return sliced.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
};

export const unmaskPhone = (value: string) => {
    return value.replace(/\D/g, '');
};
