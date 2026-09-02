/** Roles del sistema con permisos granulares: admin > editor > support > cliente */
export type UserRole = 'admin' | 'editor' | 'support' | 'cliente';

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rol: UserRole;
  created_at: string;
}

export type CoffeeCategory = '250gr' | '175gr' | 'institucional' | 'togo';

export interface Product {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_antes?: number;
  stock: number;
  categoria: CoffeeCategory;
  origen: string;
  tueste: string;
  imagen_url: string;
  activo: boolean;
  created_at: string;
}

export interface Experience {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  duracion_min: number;
  precio: number;
  capacidad_max: number;
  booking_widget: string;
  imagen_url: string;
  imagenes: string[];
  activo: boolean;
  detalles_incluidos?: string[];
  recomendaciones?: string[];
}

export interface HaciendaFeature {
  icono: string;
  texto: string;
}

export interface Hacienda {
  id: string;
  slug: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  descripcion_corta: string;
  ubicacion: string;
  capacidad_max: number;
  precio_noche: number;
  imagen_url: string;
  galeria: string[];
  features: HaciendaFeature[];
  airbnb_url: string;
  booking_url: string;
  google_maps_url: string;
  pet_friendly: boolean;
  orden: number;
  activo: boolean;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  duration: string;
  level: string;
  price: string;
  priceDetail: string;
  description: string;
  syllabus: string[];
  maxPeople: number;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  cantidad: number;
  product?: Product;
}

export type OrderStatus = 'pendiente' | 'pagado' | 'enviado' | 'entregado' | 'cancelado';

export type ReservationType = 'academia' | 'estadia';
export type ReservationStatus = 'pendiente' | 'confirmada' | 'cancelada';

export interface Reservation {
  id: string;
  tipo: ReservationType;
  item_id: string;
  item_nombre: string;
  item_slug: string;
  fecha: string; // YYYY-MM-DD
  nombre: string;
  email: string;
  telefono: string;
  cantidad_personas: number;
  estado: ReservationStatus;
  notas?: string;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  nombre: string;
  precio_unit: number;
  cantidad: number;
}

export interface ShippingAddress {
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono: string;
}

export interface Order {
  id: string;
  user_id: string;
  user_email?: string;
  estado: OrderStatus;
  total: number;
  wompi_transaction_id?: string;
  direccion_envio: ShippingAddress;
  notas?: string;
  items: OrderItem[];
  created_at: string;
}

export interface ContactMessage {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  respondido: boolean;
  created_at: string;
}

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  buttonText: string;
  buttonLink: string;
  button2Text?: string;
  button2Link?: string;
  bgImage: string;
  orden: number;
  activo: boolean;
}
