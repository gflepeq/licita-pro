// Datos del usuario seguros para pasar a componentes cliente.
export interface SafeUser {
  nombre: string;
  empresa: string;
  email: string;
  plan: string;
  iniciales: string;
  appName: string;
  accent: string;
  theme: "light" | "dark";
}
