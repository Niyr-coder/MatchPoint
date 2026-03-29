import type { SportCategory, Feature, Stat, NavLink, FooterColumn } from "@/types"

export const SITE_NAME = "MATCHPOINT"
export const SITE_TAGLINE = "DOMINA TU JUEGO"
export const SITE_DESCRIPTION =
  "La plataforma deportiva definitiva para fútbol, pádel, tenis y pickleball. Encuentra canchas, rivales y torneos cerca de ti."

export const NAV_LINKS: NavLink[] = [
  { label: "Deportes", href: "#deportes" },
  { label: "Features", href: "#features" },
  { label: "Comunidad", href: "#stats" },
  { label: "Únete", href: "#waitlist" },
]

export const SPORTS: SportCategory[] = [
  {
    id: "futbol",
    name: "Fútbol 7",
    emoji: "⚽",
    description: "El deporte rey. Encuentra ligas, equipos y canchas cercanas.",
    players: "11 vs 11",
    gradient: "from-green-900/80 to-black/90",
    image: "/images/landing/futbol.png",
  },
  {
    id: "padel",
    name: "Pádel",
    emoji: "🎾",
    description: "El deporte de moda. Reserva pistas y encuentra tu pareja ideal.",
    players: "2 vs 2",
    gradient: "from-emerald-900/80 to-black/90",
    image: "/images/landing/padel.png",
  },
  {
    id: "tenis",
    name: "Tenis",
    emoji: "🏸",
    description: "Clásico y elegante. Compite en torneos locales y mejora tu ranking.",
    players: "1 vs 1 / 2 vs 2",
    gradient: "from-lime-900/80 to-black/90",
    image: "/images/landing/tenis.png",
  },
  {
    id: "pickleball",
    name: "Pickleball",
    emoji: "🏓",
    description: "El deporte de más rápido crecimiento. Únete a la revolución.",
    players: "2 vs 2",
    gradient: "from-teal-900/80 to-black/90",
    image: "/images/landing/pickleball.png",
  },
]

export const FEATURES: Feature[] = [
  {
    icon: "MapPin",
    title: "Canchas Cerca de Ti",
    description:
      "Localiza y reserva instalaciones deportivas en tu ciudad en segundos. Sin llamadas, sin esperas.",
  },
  {
    icon: "Users",
    title: "Encuentra Rivales",
    description:
      "Conecta con jugadores de tu nivel. Sistema de matchmaking inteligente para partidos justos y emocionantes.",
  },
  {
    icon: "Trophy",
    title: "Torneos & Ligas",
    description:
      "Participa en competiciones organizadas. Desde torneos amateurs hasta ligas profesionales locales.",
  },
  {
    icon: "BarChart2",
    title: "Tus Estadísticas",
    description:
      "Rastrea tu progreso, historial de partidos y evolución de rendimiento en tiempo real.",
  },
  {
    icon: "Bell",
    title: "Notificaciones Inteligentes",
    description:
      "Alertas de partidos disponibles, canchas libres y rivales de tu nivel cuando quieres jugar.",
  },
  {
    icon: "Shield",
    title: "Pagos Seguros",
    description:
      "Reservas y pagos protegidos dentro de la app. Sin efectivo, sin complicaciones.",
  },
]

export const STATS: Stat[] = [
  { value: 5000, suffix: "+", label: "Jugadores Activos" },
  { value: 4, suffix: "", label: "Deportes" },
  { value: 200, suffix: "+", label: "Canchas Disponibles" },
  { value: 98, suffix: "%", label: "Satisfacción" },
]

export const ECUADOR_CITIES_BY_PROVINCE: Record<string, string[]> = {
  "Azuay": ["Cuenca", "Gualaceo", "Paute", "Sigsig", "Santa Isabel", "Girón", "Chordeleg", "El Pan", "Sevilla de Oro"],
  "Bolívar": ["Guaranda", "Chillanes", "Chimbo", "Echeandía", "San Miguel", "Caluma", "Las Naves"],
  "Cañar": ["Azogues", "Biblián", "Cañar", "La Troncal", "El Tambo", "Déleg", "Suscal"],
  "Carchi": ["Tulcán", "Bolívar", "Espejo", "Mira", "Montúfar", "San Pedro de Huaca"],
  "Chimborazo": ["Riobamba", "Alausí", "Colta", "Chambo", "Chunchi", "Guamote", "Guano", "Pallatanga", "Penipe", "Cumandá"],
  "Cotopaxi": ["Latacunga", "La Maná", "Pangua", "Pujilí", "Salcedo", "Saquisilí", "Sigchos"],
  "El Oro": ["Machala", "Arenillas", "Atahualpa", "Balsas", "Chilla", "El Guabo", "Huaquillas", "Marcabelí", "Pasaje", "Piñas", "Portovelo", "Santa Rosa", "Zaruma", "Las Lajas"],
  "Esmeraldas": ["Esmeraldas", "Atacames", "Eloy Alfaro", "Muisne", "Quinindé", "San Lorenzo", "Río Verde"],
  "Galápagos": ["Puerto Baquerizo Moreno", "Puerto Ayora", "Puerto Velasco Ibarra"],
  "Guayas": ["Guayaquil", "Alfredo Baquerizo Moreno", "Balao", "Balzar", "Colimes", "Daule", "Durán", "El Empalme", "El Triunfo", "Milagro", "Naranjal", "Naranjito", "Nobol", "Palestina", "Pedro Carbo", "Playas", "Samborondón", "Santa Lucía", "Salitre", "San Jacinto de Yaguachi", "Simón Bolívar"],
  "Imbabura": ["Ibarra", "Antonio Ante", "Cotacachi", "Otavalo", "Pimampiro", "San Miguel de Urcuquí"],
  "Loja": ["Loja", "Calvas", "Catamayo", "Celica", "Chaguarpamba", "Espíndola", "Gonzanamá", "Macará", "Paltas", "Puyango", "Saraguro", "Sozoranga", "Zapotillo", "Pindal", "Quilanga", "Olmedo"],
  "Los Ríos": ["Babahoyo", "Baba", "Buena Fe", "Mocache", "Montalvo", "Palenque", "Pueblo Viejo", "Quevedo", "Urdaneta", "Valencia", "Ventanas", "Vinces"],
  "Manabí": ["Portoviejo", "Chone", "El Carmen", "Flavio Alfaro", "Jipijapa", "Junín", "Manta", "Montecristi", "Olmedo", "Paján", "Pedernales", "Pichincha", "Puerto López", "Rocafuerte", "San Vicente", "Santa Ana", "Sucre", "Tosagua", "Veinticuatro de Mayo"],
  "Morona Santiago": ["Macas", "Gualaquiza", "Huamboya", "Limón Indanza", "Logroño", "Morona", "Pablo Sexto", "Palora", "San Juan Bosco", "Santiago", "Sucúa", "Taisha", "Tiwintza"],
  "Napo": ["Tena", "Archidona", "El Chaco", "Quijos", "Carlos Julio Arosemena Tola"],
  "Orellana": ["Francisco de Orellana", "Aguarico", "La Joya de los Sachas", "Loreto"],
  "Pastaza": ["Puyo", "Arajuno", "Mera", "Santa Clara"],
  "Pichincha": ["Quito", "Cayambe", "Mejía", "Pedro Moncayo", "Pedro Vicente Maldonado", "Puerto Quito", "Rumiñahui", "San Miguel de los Bancos"],
  "Santa Elena": ["Santa Elena", "La Libertad", "Salinas"],
  "Santo Domingo de los Tsáchilas": ["Santo Domingo", "La Concordia"],
  "Sucumbíos": ["Nueva Loja", "Cascales", "Cuyabeno", "Gonzalo Pizarro", "Lago Agrio", "Putumayo", "Shushufindi", "Sucumbíos"],
  "Tungurahua": ["Ambato", "Baños de Agua Santa", "Cevallos", "Mocha", "Patate", "Quero", "San Pedro de Pelileo", "Santiago de Píllaro", "Tisaleo"],
  "Zamora-Chinchipe": ["Zamora", "Centinela del Cóndor", "Chinchipe", "El Pangui", "Nangaritza", "Palanda", "Paquisha", "Yacuambí", "Yanzatza"],
}

export const ECUADOR_PROVINCES = Object.keys(ECUADOR_CITIES_BY_PROVINCE)

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Producto",
    links: [
      { label: "Características", href: "#features" },
      { label: "Deportes", href: "#deportes" },
      { label: "Precios", href: "#" },
      { label: "App Móvil", href: "#" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre Nosotros", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Prensa", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "#" },
      { label: "Términos", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
]
