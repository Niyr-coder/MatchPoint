import type { SportCategory, Feature, Stat, NavLink, FooterColumn, Testimonial } from "@/types"
import { VISIBLE_SPORT_IDS, SPORT_CONFIG } from "@/lib/sports/config"

export const SITE_NAME = "MATCHPOINT"
export const SITE_TAGLINE = "DOMINA TU JUEGO"
export const SITE_DESCRIPTION =
  "La plataforma #1 de Pickleball en Ecuador. Encuentra canchas, rivales y torneos cerca de ti."

export const NAV_LINKS: NavLink[] = [
  { label: "Pickleball", href: "#deportes" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Comunidad", href: "#comunidad" },
  { label: "Para Clubes", href: "#clubes" },
]

// Landing-page display metadata that extends SportConfig with visual fields.
// The canonical sport list comes from SPORT_IDS; this adds gradient + image.
const SPORT_LANDING_EXTRAS: Record<
  string,
  { name: string; players: string; gradient: string; image: string; stat: string }
> = {
  futbol:     { name: "Fútbol 7",   players: "11 vs 11",        gradient: "from-green-900/80 to-black/90",   image: "/images/landing/futbol.png",       stat: "80+ canchas" },
  padel:      { name: "Pádel",      players: "2 vs 2",           gradient: "from-emerald-900/80 to-black/90", image: "/images/landing/padel.png",         stat: "45+ canchas" },
  tenis:      { name: "Tenis",      players: "1 vs 1 / 2 vs 2",  gradient: "from-lime-900/80 to-black/90",    image: "/images/landing/tenis.png",         stat: "35+ canchas" },
  pickleball: { name: "Pickleball", players: "2 vs 2",           gradient: "from-teal-900/80 to-black/90",    image: "/images/landing/pickleball.png",    stat: "500+ jugadores" },
}

export const SPORTS: SportCategory[] = VISIBLE_SPORT_IDS.map((id) => {
  const cfg = SPORT_CONFIG[id]
  const extras = SPORT_LANDING_EXTRAS[id]
  return {
    id: cfg.id,
    name: extras.name,
    emoji: cfg.emoji,
    description: cfg.description,
    players: extras.players,
    gradient: extras.gradient,
    image: extras.image,
    stat: extras.stat,
  }
})

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
  { value: 50, suffix: "+", label: "Torneos Jugados" },
  { value: 200, suffix: "+", label: "Canchas Disponibles" },
  { value: 15, suffix: "+", label: "Ciudades en Ecuador" },
]

export const TESTIMONIALS: Testimonial[] = [
  { quote: "Pasé de jugar una vez al mes a tres veces por semana. La app te facilita todo.", name: "Carlos M.", sport: "Pickleball", city: "Quito", emoji: "🏓" },
  { quote: "Encontré rivales de mi nivel en días. Antes tardaba semanas buscando en grupos de WhatsApp.", name: "María L.", sport: "Pickleball", city: "Guayaquil", emoji: "🏓" },
  { quote: "El sistema de ranking me motiva a mejorar cada semana. Es adictivo.", name: "Andrés R.", sport: "Pickleball", city: "Cuenca", emoji: "🏓" },
]

export const PARTNER_CLUBS: string[] = [
  "Club Arrayanes", "Liga Pickleball EC", "Pickleball Quito Norte",
  "Pickleball GYE", "Complejo Los Chillos", "Arena Sports UIO",
  "Pickleball Cuenca", "Quito Pickleball Club",
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
    title: "Plataforma",
    links: [
      { label: "Pickleball", href: "#deportes" },
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Para Clubes", href: "#clubes" },
      { label: "Únete Gratis", href: "/login" },
    ],
  },
  {
    title: "Comunidad",
    links: [
      { label: "Comunidad", href: "#comunidad" },
      { label: "Torneos", href: "#deportes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "#" },
      { label: "Términos", href: "#" },
    ],
  },
]
