export const brand = {
  productName: "HeliServiX OS",
  subtitle: {
    en: "Aircraft Operations Intelligence Platform",
    es: "Plataforma de Inteligencia de Operaciones Aéreas"
  },
  logo: {
    src: "/brand/heliservix-logo.png",
    alt: "HeliServiX",
    width: 806,
    height: 218
  },
  colors: {
    primaryBlue: "#005BAA",
    darkNavy: "#061B2E",
    lightBlue: "#E8F3FF",
    white: "#FFFFFF",
    lightGray: "#F3F6FA",
    statusGreen: "#16A34A",
    statusYellow: "#D97706",
    statusRed: "#DC2626"
  }
} as const;

export function getTimeGreetingKey(hour = new Date().getHours()) {
  if (hour < 12) return "shell.goodMorning" as const;
  if (hour < 18) return "shell.goodAfternoon" as const;
  return "shell.goodEvening" as const;
}
