// Legal identity shown in /privacidad and /terminos (LSSI art. 10).
// TODO(legal): complete the company's registered name, NIF and address before launch.
export const LEGAL = {
  brand: "Mi Comunidad",
  company: process.env.NEXT_PUBLIC_LEGAL_COMPANY ?? "Yakasista",
  nif: process.env.NEXT_PUBLIC_LEGAL_NIF ?? "[NIF pendiente]",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "[Domicilio social pendiente]",
  email: "info@yakasista.com",
  updatedAt: "5 de noviembre de 2026",
};
