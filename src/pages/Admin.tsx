import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Plus, Trash2, Edit2, ShoppingBag, Landmark, MessageSquare, ClipboardList, PenTool,
  CheckCircle, RefreshCw, Calendar, GraduationCap, Tent, Coffee, Upload
} from 'lucide-react';
import { Product, Order, Experience, ContactMessage, CoffeeCategory, OrderStatus, CarouselSlide, Reservation, Course, Hacienda, HaciendaFeature, User, UserRole } from '../types';
import ImageUploadField from '../components/ImageUploadField';
import { uploadImage } from '../lib/upload';

const HACIENDA_ICONS = ['Sunrise', 'Moon', 'Coffee', 'TreePine', 'Car', 'Wifi', 'PawPrint', 'Users', 'MapPin'] as const;
import axios from 'axios';

export default function Admin() {
  const { user, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [activeSegment, setActiveSegment] = useState<'productos' | 'ordenes' | 'mensajes' | 'slides' | 'reservas' | 'cursos' | 'estadias' | 'experiencias' | 'usuarios'>('productos');
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    badge: '',
    buttonText: '',
    buttonLink: '',
    button2Text: '',
    button2Link: '',
    bgImage: '',
    orden: 1,
    activo: true
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    duration: '',
    level: '',
    price: '',
    priceDetail: '',
    description: '',
    syllabus: '',
    maxPeople: 10,
    orden: 1,
    activo: true
  });

  const [haciendas, setHaciendas] = useState<Hacienda[]>([]);
  const [isEditingHacienda, setIsEditingHacienda] = useState(false);
  const [editingHaciendaId, setEditingHaciendaId] = useState<string | null>(null);
  const [haciendaForm, setHaciendaForm] = useState({
    nombre: '',
    tipo: 'Glamping',
    descripcion: '',
    descripcion_corta: '',
    ubicacion: '',
    capacidad_max: 8,
    precio_noche: '',
    imagen_url: '',
    galeria: '',
    features: [] as HaciendaFeature[],
    airbnb_url: '',
    booking_url: '',
    google_maps_url: '',
    pet_friendly: false,
    orden: 1,
    activo: true
  });
  const haciendaGalleryFileRef = useRef<HTMLInputElement>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [experienceForm, setExperienceForm] = useState({
    nombre: '',
    descripcion: '',
    duracion_min: 60,
    precio: '',
    capacidad_max: 10,
    imagen_url: '',
    imagenes: '',
    detalles_incluidos: '',
    recomendaciones: '',
    booking_widget: '',
    activo: true
  });
  const experienceGalleryFileRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#FFA42C] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Verificando acceso...</p>
      </div>
    );
  }

  // CRUD Product Form States
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_antes: '',
    stock: '',
    categoria: 'grano' as CoffeeCategory,
    origen: '',
    tueste: '',
    imagen_url: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, oRes, mRes, sRes, rRes, cRes, hRes, eRes, uRes] = await Promise.allSettled([
        axios.get('/api/productos'),
        axios.get('/api/ordenes-todas'),
        axios.get('/api/contacto'),
        axios.get('/api/slides/all'),
        axios.get('/api/reservas'),
        axios.get('/api/cursos/all'),
        axios.get('/api/haciendas/all'),
        axios.get('/api/experiencias'),
        axios.get('/api/usuarios')
      ]);
      if (pRes.status === 'fulfilled' && Array.isArray(pRes.value.data)) setProducts(pRes.value.data);
      if (oRes.status === 'fulfilled' && Array.isArray(oRes.value.data)) setOrders(oRes.value.data);
      if (mRes.status === 'fulfilled' && Array.isArray(mRes.value.data)) setMessages(mRes.value.data);
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value.data)) setSlides(sRes.value.data);
      if (rRes.status === 'fulfilled' && Array.isArray(rRes.value.data)) setReservations(rRes.value.data);
      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value.data)) setCourses(cRes.value.data);
      if (hRes.status === 'fulfilled' && Array.isArray(hRes.value.data)) setHaciendas(hRes.value.data);
      if (eRes.status === 'fulfilled' && Array.isArray(eRes.value.data)) setExperiences(eRes.value.data);
      if (uRes.status === 'fulfilled' && Array.isArray(uRes.value.data)) setUsers(uRes.value.data);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.rol !== 'admin') {
      navigate('/auth/login?returnUrl=/admin');
      return;
    }
    loadData();
  }, [user, authLoading, navigate]);

  const handleCreateProductClick = () => {
    setIsEditingProduct(true);
    setEditingId(null);
    setProdForm({
      nombre: '',
      descripcion: '',
      precio: '',
      precio_antes: '',
      stock: '',
      categoria: 'grano',
      origen: '',
      tueste: '',
      imagen_url: 'https://images.unsplash.com/photo-1559056191-4819004e3827?auto=format&fit=crop&q=80&w=600'
    });
  };

  const handleEditProductClick = (p: Product) => {
    setIsEditingProduct(true);
    setEditingId(p.id);
    setProdForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio.toString(),
      precio_antes: p.precio_antes ? p.precio_antes.toString() : '',
      stock: p.stock.toString(),
      categoria: p.categoria,
      origen: p.origen,
      tueste: p.tueste,
      imagen_url: p.imagen_url
    });
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...prodForm,
        precio: Number(prodForm.precio),
        precio_antes: prodForm.precio_antes ? Number(prodForm.precio_antes) : undefined,
        stock: Number(prodForm.stock),
        activo: true
      };

      if (editingId) {
        await axios.put(`/api/productos/${editingId}`, payload);
      } else {
        await axios.post('/api/productos', payload);
      }
      setIsEditingProduct(false);
      loadData();
    } catch (err: any) {
      alert('Error guardando producto: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Desea eliminar la cosecha seleccionada?')) return;
    try {
      await axios.delete(`/api/productos/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSlideClick = () => {
    setIsEditingSlide(true);
    setEditingSlideId(null);
    setSlideForm({
      title: '',
      subtitle: '',
      badge: '',
      buttonText: '',
      buttonLink: '/tienda',
      button2Text: '',
      button2Link: '',
      bgImage: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=85&w=1200',
      orden: slides.length + 1,
      activo: true
    });
  };

  const handleEditSlideClick = (s: CarouselSlide) => {
    setIsEditingSlide(true);
    setEditingSlideId(s.id);
    setSlideForm({
      title: s.title,
      subtitle: s.subtitle,
      badge: s.badge,
      buttonText: s.buttonText,
      buttonLink: s.buttonLink,
      button2Text: s.button2Text || '',
      button2Link: s.button2Link || '',
      bgImage: s.bgImage,
      orden: s.orden,
      activo: s.activo
    });
  };

  const handleSaveSlideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...slideForm,
        button2Text: slideForm.button2Text || null,
        button2Link: slideForm.button2Link || null
      };

      if (editingSlideId) {
        await axios.put(`/api/slides/${editingSlideId}`, payload);
      } else {
        await axios.post('/api/slides', payload);
      }
      setIsEditingSlide(false);
      loadData();
    } catch (err: any) {
      alert('Error guardando slide: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm('¿Desea eliminar este slide del carrusel?')) return;
    try {
      await axios.delete(`/api/slides/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCourseClick = () => {
    setIsEditingCourse(true);
    setEditingCourseId(null);
    setCourseForm({
      title: '',
      duration: '',
      level: '',
      price: '',
      priceDetail: '',
      description: '',
      syllabus: '',
      maxPeople: 10,
      orden: courses.length + 1,
      activo: true
    });
  };

  const handleEditCourseClick = (c: Course) => {
    setIsEditingCourse(true);
    setEditingCourseId(c.id);
    setCourseForm({
      title: c.title,
      duration: c.duration,
      level: c.level,
      price: c.price,
      priceDetail: c.priceDetail,
      description: c.description,
      syllabus: (c.syllabus || []).join('\n'),
      maxPeople: c.maxPeople,
      orden: c.orden,
      activo: c.activo
    });
  };

  const handleSaveCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...courseForm,
        syllabus: courseForm.syllabus.split('\n').map(s => s.trim()).filter(Boolean),
        maxPeople: Number(courseForm.maxPeople),
      };

      if (editingCourseId) {
        await axios.put(`/api/cursos/${editingCourseId}`, payload);
      } else {
        await axios.post('/api/cursos', payload);
      }
      setIsEditingCourse(false);
      loadData();
    } catch (err: any) {
      alert('Error guardando curso: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('¿Desea eliminar este curso de la Academia?')) return;
    try {
      await axios.delete(`/api/cursos/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateHaciendaClick = () => {
    setIsEditingHacienda(true);
    setEditingHaciendaId(null);
    setHaciendaForm({
      nombre: '',
      tipo: 'Glamping',
      descripcion: '',
      descripcion_corta: '',
      ubicacion: '',
      capacidad_max: 8,
      precio_noche: '',
      imagen_url: '',
      galeria: '',
      features: [],
      airbnb_url: '',
      booking_url: '',
      google_maps_url: '',
      pet_friendly: false,
      orden: haciendas.length + 1,
      activo: true
    });
  };

  const handleEditHaciendaClick = (h: Hacienda) => {
    setIsEditingHacienda(true);
    setEditingHaciendaId(h.id);
    setHaciendaForm({
      nombre: h.nombre,
      tipo: h.tipo,
      descripcion: h.descripcion,
      descripcion_corta: h.descripcion_corta,
      ubicacion: h.ubicacion,
      capacidad_max: h.capacidad_max,
      precio_noche: h.precio_noche.toString(),
      imagen_url: h.imagen_url,
      galeria: (h.galeria || []).join('\n'),
      features: h.features || [],
      airbnb_url: h.airbnb_url,
      booking_url: h.booking_url,
      google_maps_url: h.google_maps_url,
      pet_friendly: h.pet_friendly,
      orden: h.orden,
      activo: h.activo
    });
  };

  const handleSaveHaciendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...haciendaForm,
        capacidad_max: Number(haciendaForm.capacidad_max),
        precio_noche: Number(haciendaForm.precio_noche),
        galeria: haciendaForm.galeria.split('\n').map(s => s.trim()).filter(Boolean),
      };

      if (editingHaciendaId) {
        await axios.put(`/api/haciendas/${editingHaciendaId}`, payload);
      } else {
        await axios.post('/api/haciendas', payload);
      }
      setIsEditingHacienda(false);
      loadData();
    } catch (err: any) {
      alert('Error guardando estadía: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteHacienda = async (id: string) => {
    if (!confirm('¿Desea eliminar esta estadía?')) return;
    try {
      await axios.delete(`/api/haciendas/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHaciendaFeature = () => {
    setHaciendaForm({ ...haciendaForm, features: [...haciendaForm.features, { icono: HACIENDA_ICONS[0], texto: '' }] });
  };

  const handleUpdateHaciendaFeature = (idx: number, updates: Partial<HaciendaFeature>) => {
    setHaciendaForm({
      ...haciendaForm,
      features: haciendaForm.features.map((f, i) => i === idx ? { ...f, ...updates } : f)
    });
  };

  const handleRemoveHaciendaFeature = (idx: number) => {
    setHaciendaForm({ ...haciendaForm, features: haciendaForm.features.filter((_, i) => i !== idx) });
  };

  const handleHaciendaGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      const url = await uploadImage(file);
      setHaciendaForm(prev => ({ ...prev, galeria: prev.galeria ? prev.galeria + '\n' + url : url }));
    } catch (err: any) {
      alert('Error subiendo imagen: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingGallery(false);
      if (haciendaGalleryFileRef.current) haciendaGalleryFileRef.current.value = '';
    }
  };

  const handleCreateExperienceClick = () => {
    setIsEditingExperience(true);
    setEditingExperienceId(null);
    setExperienceForm({
      nombre: '',
      descripcion: '',
      duracion_min: 60,
      precio: '',
      capacidad_max: 10,
      imagen_url: '',
      imagenes: '',
      detalles_incluidos: '',
      recomendaciones: '',
      booking_widget: '',
      activo: true
    });
  };

  const handleEditExperienceClick = (exp: Experience) => {
    setIsEditingExperience(true);
    setEditingExperienceId(exp.id);
    setExperienceForm({
      nombre: exp.nombre,
      descripcion: exp.descripcion,
      duracion_min: exp.duracion_min,
      precio: exp.precio.toString(),
      capacidad_max: exp.capacidad_max,
      imagen_url: exp.imagen_url,
      imagenes: (exp.imagenes || []).join('\n'),
      detalles_incluidos: (exp.detalles_incluidos || []).join('\n'),
      recomendaciones: (exp.recomendaciones || []).join('\n'),
      booking_widget: exp.booking_widget || '',
      activo: exp.activo
    });
  };

  const handleSaveExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...experienceForm,
        precio: Number(experienceForm.precio),
        imagenes: experienceForm.imagenes.split('\n').map(s => s.trim()).filter(Boolean),
        detalles_incluidos: experienceForm.detalles_incluidos.split('\n').map(s => s.trim()).filter(Boolean),
        recomendaciones: experienceForm.recomendaciones.split('\n').map(s => s.trim()).filter(Boolean),
      };

      if (editingExperienceId) {
        await axios.put(`/api/experiencias/${editingExperienceId}`, payload);
      } else {
        await axios.post('/api/experiencias', payload);
      }
      setIsEditingExperience(false);
      loadData();
    } catch (err: any) {
      alert('Error guardando experiencia: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('¿Desea eliminar esta experiencia?')) return;
    try {
      await axios.delete(`/api/experiencias/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExperienceGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      const url = await uploadImage(file);
      setExperienceForm(prev => ({ ...prev, imagenes: prev.imagenes ? prev.imagenes + '\n' + url : url }));
    } catch (err: any) {
      alert('Error subiendo imagen: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingGallery(false);
      if (experienceGalleryFileRef.current) experienceGalleryFileRef.current.value = '';
    }
  };

  const handleChangeUserRole = async (userId: string, rol: UserRole) => {
    try {
      await axios.put(`/api/usuarios/${userId}/rol`, { rol });
      loadData();
    } catch (err: any) {
      alert('Error cambiando rol: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Desea eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`/api/usuarios/${userId}`);
      loadData();
    } catch (err: any) {
      alert('Error eliminando usuario: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await axios.put(`/api/ordenes/${orderId}/estado`, { estado: status });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkMessageRead = async (msgId: string) => {
    try {
      await axios.put(`/api/contacto/${msgId}/leer`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics calculating
  const paidOrders = orders.filter(o => o.estado === 'pagado');
  const revenueTotal = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingInquiries = messages.filter(m => !m.respondido);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-805 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Cargando panel operacional...</p>
      </div>
    );
  }

  return (
    <div id="admin-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-extrabold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#FFA42C]" />
            <span>Mesa de Operaciones Jaguar</span>
          </h1>
          <p className="text-sm text-stone-500">Consola ejecutiva para CRUD de inventarios, despachos de transacciones y correspondencia.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-105 border border-stone-250 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refrescar Panel</span>
        </button>
      </div>

      {/* Analytics Bento metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-stone-200 p-6 rounded-2xl flex items-center gap-4">
          <span className="p-3 bg-emerald-50 text-emerald-800 rounded-xl leading-none">
            <Landmark className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-xs uppercase text-stone-400 font-mono">Ventas Totales</span>
            <span className="text-lg font-black font-sans text-stone-900">${revenueTotal.toLocaleString('es-CO')} COP</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-2xl flex items-center gap-4">
          <span className="p-3 bg-amber-50 text-amber-800 rounded-xl leading-none">
            <ClipboardList className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-xs uppercase text-stone-400 font-mono font-mono">Pedidos Totales</span>
            <span className="text-lg font-black text-stone-900">{orders.length} órd.</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-2xl flex items-center gap-4">
          <span className="p-3 bg-stone-50 text-stone-800 rounded-xl leading-none">
            <ShoppingBag className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-xs uppercase text-stone-400 font-mono">Variedades Café</span>
            <span className="text-lg font-black text-stone-900">{products.length} réf.</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-2xl flex items-center gap-4">
          <span className="p-3 bg-rose-50 text-rose-800 rounded-xl leading-none">
            <MessageSquare className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-xs uppercase text-stone-400 font-mono">Contacto Activos</span>
            <span className="text-lg font-black text-stone-900">{pendingInquiries.length} pend.</span>
          </div>
        </div>
      </div>

      {/* Row tab selectors admin */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          onClick={() => { setActiveSegment('productos'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'productos' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Cafés (CRUD)
        </button>
        <button
          onClick={() => { setActiveSegment('ordenes'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'ordenes' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Despachar Pedidos
        </button>
        <button
          onClick={() => { setActiveSegment('mensajes'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'mensajes' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Mensajes de Ayuda ({pendingInquiries.length})
        </button>
        <button
          onClick={() => { setActiveSegment('slides'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'slides' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Banner Home
        </button>
        <button
          onClick={() => { setActiveSegment('reservas'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'reservas' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Reservas ({reservations.length})
        </button>
        <button
          onClick={() => { setActiveSegment('cursos'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'cursos' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Cursos Academia ({courses.length})
        </button>
        <button
          onClick={() => { setActiveSegment('estadias'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'estadias' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Estadías ({haciendas.length})
        </button>
        <button
          onClick={() => { setActiveSegment('experiencias'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'experiencias' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Experiencias ({experiences.length})
        </button>
        <button
          onClick={() => { setActiveSegment('usuarios'); setIsEditingProduct(false); setIsEditingSlide(false); setIsEditingCourse(false); setIsEditingHacienda(false); setIsEditingExperience(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'usuarios' ? 'border-[#122C9B] text-[#122C9B] font-black' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          Usuarios ({users.length})
        </button>
      </div>

      {/* CRUD PANEL EXECUTION SECTIONS */}
      {isEditingProduct && !isEditingSlide ? (
        <form onSubmit={handleSaveProductSubmit} className="bg-white border border-stone-200 rounded-3xl p-8 shadow space-y-6 max-w-2xl">
          <h3 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[#FFA42C]" />
            <span>{editingId ? 'Editar Cosecha Cafetera' : 'Añadir Nueva Cosecha o Café'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Nombre Producto</label>
              <input
                type="text"
                required
                value={prodForm.nombre}
                onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                placeholder="Ej. Jaguar Tabi Reserve"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Categoría</label>
              <select
                value={prodForm.categoria}
                onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value as CoffeeCategory })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
              >
                <option value="grano">Café en Grano</option>
                <option value="molido">Café Molido</option>
                <option value="capsulas">Cápsulas compatibles</option>
                <option value="kit">Kits Barista</option>
                <option value="accesorio">Accesorio y vajilla</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700 font-mono uppercase font-semibold">Descripción o Reseña Sensorial</label>
            <textarea
              required
              value={prodForm.descripcion}
              onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })}
              placeholder="Notas de cata, perfil de taza, altitud de siembra..."
              rows={4}
              className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Precio Normal (COP)</label>
              <input
                type="number"
                required
                value={prodForm.precio}
                onChange={(e) => setProdForm({ ...prodForm, precio: e.target.value })}
                placeholder="45000"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Precio Oferta (COP)</label>
              <input
                type="number"
                value={prodForm.precio_antes}
                onChange={(e) => setProdForm({ ...prodForm, precio_antes: e.target.value })}
                placeholder="55000"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-light">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Stock Unidades</label>
              <input
                type="number"
                required
                value={prodForm.stock}
                onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                placeholder="20"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Origen Siembra</label>
              <input
                type="text"
                required
                value={prodForm.origen}
                onChange={(e) => setProdForm({ ...prodForm, origen: e.target.value })}
                placeholder="Huila"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Nivel Tueste</label>
              <input
                type="text"
                required
                value={prodForm.tueste}
                onChange={(e) => setProdForm({ ...prodForm, tueste: e.target.value })}
                placeholder="Medio"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <ImageUploadField
            label="Foto del producto"
            value={prodForm.imagen_url}
            onChange={(url) => setProdForm({ ...prodForm, imagen_url: url })}
          />

          <div className="pt-2 flex gap-4">
            <button
              type="submit"
              className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Guardar Cosecha
            </button>
            <button
              type="button"
              onClick={() => setIsEditingProduct(false)}
              className="px-6 py-3 bg-white border border-stone-300 text-stone-705 rounded-xl text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          
          {/* SEGMENT 1: PRODUCTOS LIST & OPTIONS */}
          {activeSegment === 'productos' && (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 bg-stone-50 border-b border-stone-150 flex justify-between items-center">
                <h3 className="font-display font-bold text-stone-900 text-sm">Cosechas del Menú ({products.length})</h3>
                  <button
                    onClick={handleCreateProductClick}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#122C9B] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Cosecha</span>
                  </button>
              </div>

              {/* Grid tabular table products */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-105 border-b border-stone-150 text-stone-500 font-mono uppercase">
                      <th className="p-4 font-semibold">Cosecha / Descripción</th>
                      <th className="p-4 font-semibold">Sabor / Roast</th>
                      <th className="p-4 font-semibold">Stock</th>
                      <th className="p-4 font-semibold">Precio COP</th>
                      <th className="p-4 text-center font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-lg overflow-hidden bg-stone-105 flex-shrink-0 leading-none">
                              <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                            </span>
                            <div>
                              <p className="font-bold text-stone-900 text-sm">{p.nombre}</p>
                              <p className="text-[10px] text-stone-400 font-mono">Slug: {p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-stone-700">{p.origen}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Tueste: {p.tueste}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                            p.stock === 0 ? 'bg-rose-50 text-rose-800' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {p.stock} uds.
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-stone-900">
                          ${p.precio.toLocaleString('es-CO')}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditProductClick(p)}
                              className="p-1 px-2.5 bg-stone-100 hover:bg-stone-250 border border-stone-200 rounded text-stone-700 cursor-pointer"
                              title="Editar producto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-rose-700 cursor-pointer"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEGMENT 2: ORDENES / DESPACHOS LIST */}
          {activeSegment === 'ordenes' && (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 bg-stone-50 border-b border-stone-150">
                <h3 className="font-display font-bold text-stone-900 text-sm">Gestionar Despachos de E-commerce</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-105 border-b border-stone-150 text-stone-500 font-mono uppercase">
                      <th className="p-4 font-semibold">Código Orden</th>
                      <th className="p-4 font-semibold">Cliente Correo</th>
                      <th className="p-4 font-semibold">Dirección Envío</th>
                      <th className="p-4 font-semibold font-mono">Total COP</th>
                      <th className="p-4 font-semibold text-center">Estado / Modificar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-stone-50/50">
                        <td className="p-4">
                          <p className="font-bold text-stone-900">{o.id}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{new Date(o.created_at).toLocaleString()}</p>
                        </td>
                        <td className="p-4 font-mono text-stone-605">
                          {o.user_email || 'Cliente general'}
                        </td>
                        <td className="p-4 leading-normal">
                          <p className="font-semibold text-stone-800">{o.direccion_envio.direccion}</p>
                          <p className="text-[10px] text-stone-400">{o.direccion_envio.ciudad}, {o.direccion_envio.departamento}</p>
                        </td>
                        <td className="p-4 font-mono font-bold text-stone-950">
                          ${o.total.toLocaleString('es-CO')}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                              o.estado === 'pagado'
                                ? 'bg-emerald-50 text-emerald-800'
                                : o.estado === 'pendiente'
                                ? 'bg-amber-50 text-amber-800'
                                : o.estado === 'enviado'
                                ? 'bg-indigo-50 text-indigo-805'
                                : o.estado === 'entregado'
                                ? 'bg-slate-50 text-slate-808'
                                : 'bg-rose-50 text-rose-800'
                            }`}>
                              {o.estado}
                            </span>
                            
                            <select
                              value={o.estado}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                              className="px-2 py-1 bg-white border border-stone-300 text-[10px] rounded"
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="pagado">Pagado</option>
                              <option value="enviado">Enviado</option>
                              <option value="entregado">Entregado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEGMENT 3: MENSAJES DE SOPORTE */}
          {activeSegment === 'mensajes' && (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm space-y-4">
              <div className="p-6 bg-stone-50 border-b border-stone-150">
                <h3 className="font-display font-bold text-stone-900 text-sm font-semibold">Correspondencia de Clientes ({messages.length})</h3>
              </div>

              {messages.length === 0 ? (
                <div className="p-8 text-center text-stone-500 font-light font-sans">No hay correspondencias cursadas.</div>
              ) : (
                <div className="divide-y divide-stone-150 px-6 pb-6">
                  {messages.map((m) => (
                    <div key={m.id} className="py-4 space-y-2 last:pb-0">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-stone-900">{m.asunto}</h4>
                          <p className="text-[10px] text-stone-500 font-mono">Remitente: {m.nombre} ({m.email})</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {m.respondido ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold rounded-lg uppercase">
                              <CheckCircle className="w-3 h-3 text-emerald-700" />
                              <span>Revisado</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkMessageRead(m.id)}
                              className="px-2.5 py-1.5 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-[10px] font-mono font-bold rounded-xl transition cursor-pointer"
                            >
                              Marcar como Leído
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-105 leading-relaxed font-light font-sans">
                        {m.mensaje}
                      </p>
                    </div>
                  ))}
</div>
              )}
            </div>
          )}

          {/* SEGMENT 4: SLIDES / BANNER HOME */}
          {activeSegment === 'slides' && (
            <>
              {isEditingSlide ? (
                <form onSubmit={handleSaveSlideSubmit} className="bg-white border border-stone-200 rounded-2xl p-8 shadow space-y-6">
                  <h3 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-[#FFA42C]" />
                    <span>{editingSlideId ? 'Editar Slide del Banner' : 'Crear Nuevo Slide'}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Título (usa \n para salto de línea)</label>
                      <input
                        type="text"
                        required
                        value={slideForm.title}
                        onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                        placeholder="Café Exótico\nJaguar Coffee"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Badge / Etiqueta Superior</label>
                      <input
                        type="text"
                        required
                        value={slideForm.badge}
                        onChange={(e) => setSlideForm({ ...slideForm, badge: e.target.value })}
                        placeholder="Mejor Café de Cundinamarca"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Subtítulo / Descripción</label>
                    <textarea
                      required
                      value={slideForm.subtitle}
                      onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                      placeholder="Descripción breve del slide..."
                      rows={2}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Texto Botón Principal</label>
                      <input
                        type="text"
                        required
                        value={slideForm.buttonText}
                        onChange={(e) => setSlideForm({ ...slideForm, buttonText: e.target.value })}
                        placeholder="Explorar Cosechas"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Link Botón Principal</label>
                      <input
                        type="text"
                        required
                        value={slideForm.buttonLink}
                        onChange={(e) => setSlideForm({ ...slideForm, buttonLink: e.target.value })}
                        placeholder="/tienda"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Texto Botón Secundario (opcional)</label>
                      <input
                        type="text"
                        value={slideForm.button2Text}
                        onChange={(e) => setSlideForm({ ...slideForm, button2Text: e.target.value })}
                        placeholder="Ver Academia"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Link Botón Secundario (opcional)</label>
                      <input
                        type="text"
                        value={slideForm.button2Link}
                        onChange={(e) => setSlideForm({ ...slideForm, button2Link: e.target.value })}
                        placeholder="/academia"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <ImageUploadField
                    label="Imagen de fondo"
                    value={slideForm.bgImage}
                    onChange={(url) => setSlideForm({ ...slideForm, bgImage: url })}
                    placeholder="https://images.unsplash.com/photo-..."
                  />

                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Orden</label>
                      <input
                        type="number"
                        min="1"
                        value={slideForm.orden}
                        onChange={(e) => setSlideForm({ ...slideForm, orden: parseInt(e.target.value) || 1 })}
                        className="w-20 px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="activo"
                        checked={slideForm.activo}
                        onChange={(e) => setSlideForm({ ...slideForm, activo: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="activo" className="text-xs font-medium text-stone-700">Slide activo</label>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Guardar Slide
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingSlide(false)}
                      className="px-6 py-3 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 bg-stone-50 border-b border-stone-150 flex justify-between items-center">
                    <h3 className="font-display font-bold text-stone-900 text-sm">Slides del Banner Home ({(slides || []).length})</h3>
                    <button
                      onClick={handleCreateSlideClick}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#122C9B] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear Slide</span>
                    </button>
                  </div>

                  <div className="divide-y divide-stone-150">
                    {(slides || []).map((s) => (
                      <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-stone-50/50">
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                          <img src={s.bgImage} alt={s.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-stone-900 truncate">{s.title.replace(/\n/g, ' ')}</p>
                          <p className="text-[10px] text-stone-500 font-mono truncate">{s.badge} • Orden: {s.orden}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${s.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                            {s.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          <button
                            onClick={() => handleEditSlideClick(s)}
                            className="p-1.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlide(s.id)}
                            className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SEGMENT 5: RESERVAS / CALENDARIO */}
          {activeSegment === 'reservas' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <h3 className="font-display text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#FFA42C]" />
                  <span>Solicitudes de Reserva</span>
                </h3>
                <button
                  onClick={loadData}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  title="Recargar"
                >
                  <RefreshCw className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {reservations.length === 0 ? (
                <div className="text-center py-10 text-stone-500">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                  <p className="text-sm">No hay solicitudes de reserva aún.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-stone-500 border-b border-stone-100">
                        <th className="text-left py-2 px-3 font-mono uppercase">Fecha</th>
                        <th className="text-left py-2 px-3 font-mono uppercase">Tipo / Item</th>
                        <th className="text-left py-2 px-3 font-mono uppercase">Solicitante</th>
                        <th className="text-left py-2 px-3 font-mono uppercase">Contacto</th>
                        <th className="text-left py-2 px-3 font-mono uppercase">Personas</th>
                        <th className="text-left py-2 px-3 font-mono uppercase">Estado</th>
                        <th className="text-left py-2 px-3 font-mono uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((res) => (
                        <tr key={res.id} className="border-b border-stone-50 hover:bg-stone-50">
                          <td className="py-3 px-3 font-medium">{new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="py-3 px-3">
                            <span className="block font-semibold text-stone-700">{res.item_nombre}</span>
                            <span className="text-stone-400 uppercase text-[10px]">{res.tipo}</span>
                          </td>
                          <td className="py-3 px-3">{res.nombre}</td>
                          <td className="py-3 px-3">
                            <span className="block">{res.telefono}</span>
                            <span className="text-stone-400">{res.email}</span>
                          </td>
                          <td className="py-3 px-3">{res.cantidad_personas}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              res.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' :
                              res.estado === 'cancelada' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {res.estado}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {res.estado !== 'confirmada' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await axios.put(`/api/reservas/${res.id}/estado`, { estado: 'confirmada' });
                                      loadData();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                                  title="Confirmar"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {res.estado !== 'cancelada' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await axios.put(`/api/reservas/${res.id}/estado`, { estado: 'cancelada' });
                                      loadData();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition-colors"
                                  title="Cancelar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SEGMENT 6: CURSOS ACADEMIA */}
          {activeSegment === 'cursos' && (
            <>
              {isEditingCourse ? (
                <form onSubmit={handleSaveCourseSubmit} className="bg-white border border-stone-200 rounded-2xl p-8 shadow space-y-6">
                  <h3 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#FFA42C]" />
                    <span>{editingCourseId ? 'Editar Curso' : 'Crear Nuevo Curso'}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Título del curso</label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        placeholder="Curso Integral de Barismo Básico"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Nivel</label>
                      <input
                        type="text"
                        required
                        value={courseForm.level}
                        onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                        placeholder="Principiante"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Duración</label>
                      <input
                        type="text"
                        required
                        value={courseForm.duration}
                        onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                        placeholder="30 horas"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Precio (texto libre)</label>
                      <input
                        type="text"
                        required
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                        placeholder="$2.200.000"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Cupo máximo</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={courseForm.maxPeople}
                        onChange={(e) => setCourseForm({ ...courseForm, maxPeople: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Detalle de precio (opcional)</label>
                    <input
                      type="text"
                      value={courseForm.priceDetail}
                      onChange={(e) => setCourseForm({ ...courseForm, priceDetail: e.target.value })}
                      placeholder="Curso completo · 5 módulos de 6 hrs c/u"
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Descripción</label>
                    <textarea
                      required
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Temario (un ítem por línea)</label>
                    <textarea
                      required
                      value={courseForm.syllabus}
                      onChange={(e) => setCourseForm({ ...courseForm, syllabus: e.target.value })}
                      placeholder={'Historia del café, origen, especies y variedades.\nBarista Espresso básico...'}
                      rows={6}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Orden</label>
                      <input
                        type="number"
                        min="1"
                        value={courseForm.orden}
                        onChange={(e) => setCourseForm({ ...courseForm, orden: parseInt(e.target.value) || 1 })}
                        className="w-20 px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="curso-activo"
                        checked={courseForm.activo}
                        onChange={(e) => setCourseForm({ ...courseForm, activo: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="curso-activo" className="text-xs font-medium text-stone-700">Curso activo</label>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Guardar Curso
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCourse(false)}
                      className="px-6 py-3 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 bg-stone-50 border-b border-stone-150 flex justify-between items-center">
                    <h3 className="font-display font-bold text-stone-900 text-sm">Cursos de la Academia ({courses.length})</h3>
                    <button
                      onClick={handleCreateCourseClick}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#122C9B] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear Curso</span>
                    </button>
                  </div>

                  <div className="divide-y divide-stone-150">
                    {courses.map((c) => (
                      <div key={c.id} className="p-4 flex items-center gap-4 hover:bg-stone-50/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-stone-900 truncate">{c.title}</p>
                          <p className="text-[10px] text-stone-500 font-mono truncate">{c.level} • {c.duration} • {c.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${c.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          <button
                            onClick={() => handleEditCourseClick(c)}
                            className="p-1.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SEGMENT 7: ESTADÍAS / HACIENDAS */}
          {activeSegment === 'estadias' && (
            <>
              {isEditingHacienda ? (
                <form onSubmit={handleSaveHaciendaSubmit} className="bg-white border border-stone-200 rounded-2xl p-8 shadow space-y-6">
                  <h3 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                    <Tent className="w-5 h-5 text-[#FFA42C]" />
                    <span>{editingHaciendaId ? 'Editar Estadía' : 'Crear Nueva Estadía'}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Nombre</label>
                      <input
                        type="text"
                        required
                        value={haciendaForm.nombre}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, nombre: e.target.value })}
                        placeholder="Glamping Finca Cafetera"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Tipo / Etiqueta</label>
                      <input
                        type="text"
                        required
                        value={haciendaForm.tipo}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, tipo: e.target.value })}
                        placeholder="Glamping"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Descripción corta (para el listado)</label>
                    <input
                      type="text"
                      required
                      value={haciendaForm.descripcion_corta}
                      onChange={(e) => setHaciendaForm({ ...haciendaForm, descripcion_corta: e.target.value })}
                      placeholder="Experiencia ecológica con fogata, atardeceres y caminatas entre cafetales."
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Descripción completa</label>
                    <textarea
                      required
                      value={haciendaForm.descripcion}
                      onChange={(e) => setHaciendaForm({ ...haciendaForm, descripcion: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Ubicación</label>
                      <input
                        type="text"
                        required
                        value={haciendaForm.ubicacion}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, ubicacion: e.target.value })}
                        placeholder="Silvania, Cundinamarca"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Capacidad máxima</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={haciendaForm.capacidad_max}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, capacidad_max: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Precio por noche (COP)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={haciendaForm.precio_noche}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, precio_noche: e.target.value })}
                        placeholder="350000"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <ImageUploadField
                    label="Imagen principal"
                    value={haciendaForm.imagen_url}
                    onChange={(url) => setHaciendaForm({ ...haciendaForm, imagen_url: url })}
                    placeholder="/images/TURISMO/GLAMP1.webp"
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Galería (una imagen por línea)</label>
                    <textarea
                      value={haciendaForm.galeria}
                      onChange={(e) => setHaciendaForm({ ...haciendaForm, galeria: e.target.value })}
                      placeholder={'/images/TURISMO/GLAMP1.webp\n/images/TURISMO/GLAMP2.webp'}
                      rows={4}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                    <input
                      ref={haciendaGalleryFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleHaciendaGalleryUpload}
                      hidden
                    />
                    <button
                      type="button"
                      onClick={() => haciendaGalleryFileRef.current?.click()}
                      disabled={uploadingGallery}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingGallery ? 'Subiendo...' : 'Subir y agregar a la galería'}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Features (ícono + texto)</label>
                    {haciendaForm.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={f.icono}
                          onChange={(e) => handleUpdateHaciendaFeature(idx, { icono: e.target.value })}
                          className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs w-36"
                        >
                          {HACIENDA_ICONS.map((icon) => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={f.texto}
                          onChange={(e) => handleUpdateHaciendaFeature(idx, { texto: e.target.value })}
                          placeholder="WiFi gratuito"
                          className="flex-1 px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveHaciendaFeature(idx)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddHaciendaFeature}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar feature</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">URL de Airbnb</label>
                      <input
                        type="text"
                        value={haciendaForm.airbnb_url}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, airbnb_url: e.target.value })}
                        placeholder="https://www.airbnb.es/h/..."
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">URL de Booking</label>
                      <input
                        type="text"
                        value={haciendaForm.booking_url}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, booking_url: e.target.value })}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">URL de Google Maps</label>
                      <input
                        type="text"
                        value={haciendaForm.google_maps_url}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, google_maps_url: e.target.value })}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Orden</label>
                      <input
                        type="number"
                        min="1"
                        value={haciendaForm.orden}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, orden: parseInt(e.target.value) || 1 })}
                        className="w-20 px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="hacienda-pet"
                        checked={haciendaForm.pet_friendly}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, pet_friendly: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="hacienda-pet" className="text-xs font-medium text-stone-700">Pet friendly</label>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="hacienda-activo"
                        checked={haciendaForm.activo}
                        onChange={(e) => setHaciendaForm({ ...haciendaForm, activo: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="hacienda-activo" className="text-xs font-medium text-stone-700">Estadía activa</label>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Guardar Estadía
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingHacienda(false)}
                      className="px-6 py-3 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 bg-stone-50 border-b border-stone-150 flex justify-between items-center">
                    <h3 className="font-display font-bold text-stone-900 text-sm">Estadías ({haciendas.length})</h3>
                    <button
                      onClick={handleCreateHaciendaClick}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#122C9B] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear Estadía</span>
                    </button>
                  </div>

                  <div className="divide-y divide-stone-150">
                    {haciendas.map((h) => (
                      <div key={h.id} className="p-4 flex items-center gap-4 hover:bg-stone-50/50">
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                          <img src={h.imagen_url} alt={h.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-stone-900 truncate">{h.nombre}</p>
                          <p className="text-[10px] text-stone-500 font-mono truncate">{h.tipo} • ${h.precio_noche.toLocaleString('es-CO')}/noche • Máx {h.capacidad_max}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${h.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                            {h.activo ? 'Activa' : 'Inactiva'}
                          </span>
                          <button
                            onClick={() => handleEditHaciendaClick(h)}
                            className="p-1.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHacienda(h.id)}
                            className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SEGMENT 8: EXPERIENCIAS */}
          {activeSegment === 'experiencias' && (
            <>
              {isEditingExperience ? (
                <form onSubmit={handleSaveExperienceSubmit} className="bg-white border border-stone-200 rounded-2xl p-8 shadow space-y-6">
                  <h3 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-[#FFA42C]" />
                    <span>{editingExperienceId ? 'Editar Experiencia' : 'Crear Nueva Experiencia'}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Nombre</label>
                      <input
                        type="text"
                        required
                        value={experienceForm.nombre}
                        onChange={(e) => setExperienceForm({ ...experienceForm, nombre: e.target.value })}
                        placeholder="Cata de Cafés de Especialidad"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Precio (COP)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={experienceForm.precio}
                        onChange={(e) => setExperienceForm({ ...experienceForm, precio: e.target.value })}
                        placeholder="90000"
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Descripción</label>
                    <textarea
                      required
                      value={experienceForm.descripcion}
                      onChange={(e) => setExperienceForm({ ...experienceForm, descripcion: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Duración (minutos)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={experienceForm.duracion_min}
                        onChange={(e) => setExperienceForm({ ...experienceForm, duracion_min: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Capacidad máxima</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={experienceForm.capacidad_max}
                        onChange={(e) => setExperienceForm({ ...experienceForm, capacidad_max: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <ImageUploadField
                    label="Imagen principal"
                    value={experienceForm.imagen_url}
                    onChange={(url) => setExperienceForm({ ...experienceForm, imagen_url: url })}
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Galería (una imagen por línea)</label>
                    <textarea
                      value={experienceForm.imagenes}
                      onChange={(e) => setExperienceForm({ ...experienceForm, imagenes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                    <input
                      ref={experienceGalleryFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleExperienceGalleryUpload}
                      hidden
                    />
                    <button
                      type="button"
                      onClick={() => experienceGalleryFileRef.current?.click()}
                      disabled={uploadingGallery}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingGallery ? 'Subiendo...' : 'Subir y agregar a la galería'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Detalles incluidos (uno por línea)</label>
                    <textarea
                      value={experienceForm.detalles_incluidos}
                      onChange={(e) => setExperienceForm({ ...experienceForm, detalles_incluidos: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Recomendaciones (una por línea)</label>
                    <textarea
                      value={experienceForm.recomendaciones}
                      onChange={(e) => setExperienceForm({ ...experienceForm, recomendaciones: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Booking widget (HTML, opcional)</label>
                    <textarea
                      value={experienceForm.booking_widget}
                      onChange={(e) => setExperienceForm({ ...experienceForm, booking_widget: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs resize-none font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="experiencia-activo"
                      checked={experienceForm.activo}
                      onChange={(e) => setExperienceForm({ ...experienceForm, activo: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="experiencia-activo" className="text-xs font-medium text-stone-700">Experiencia activa</label>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Guardar Experiencia
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingExperience(false)}
                      className="px-6 py-3 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 bg-stone-50 border-b border-stone-150 flex justify-between items-center">
                    <h3 className="font-display font-bold text-stone-900 text-sm">Experiencias ({experiences.length})</h3>
                    <button
                      onClick={handleCreateExperienceClick}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#122C9B] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear Experiencia</span>
                    </button>
                  </div>

                  <div className="divide-y divide-stone-150">
                    {experiences.map((exp) => (
                      <div key={exp.id} className="p-4 flex items-center gap-4 hover:bg-stone-50/50">
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                          <img src={exp.imagen_url} alt={exp.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-stone-900 truncate">{exp.nombre}</p>
                          <p className="text-[10px] text-stone-500 font-mono truncate">${exp.precio.toLocaleString('es-CO')} • {exp.duracion_min} min • Máx {exp.capacidad_max}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${exp.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                            {exp.activo ? 'Activa' : 'Inactiva'}
                          </span>
                          <button
                            onClick={() => handleEditExperienceClick(exp)}
                            className="p-1.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExperience(exp.id)}
                            className="p-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SEGMENT 9: USUARIOS */}
          {activeSegment === 'usuarios' && (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 bg-stone-50 border-b border-stone-150">
                <h3 className="font-display font-bold text-stone-900 text-sm">Usuarios ({users.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-105 border-b border-stone-150 text-stone-500 font-mono uppercase">
                      <th className="p-4 font-semibold">Nombre / Email</th>
                      <th className="p-4 font-semibold">Teléfono</th>
                      <th className="p-4 font-semibold">Rol</th>
                      <th className="p-4 font-semibold">Registrado</th>
                      <th className="p-4 text-center font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {users.map((u) => {
                      const isSelf = u.id === user?.id;
                      return (
                        <tr key={u.id} className="hover:bg-stone-50/50">
                          <td className="p-4">
                            <p className="font-bold text-stone-900 text-sm">{u.nombre} {u.apellido}</p>
                            <p className="text-[10px] text-stone-400 font-mono">{u.email}</p>
                          </td>
                          <td className="p-4 text-stone-700">{u.telefono || '—'}</td>
                          <td className="p-4">
                            <select
                              value={u.rol}
                              disabled={isSelf}
                              onChange={(e) => handleChangeUserRole(u.id, e.target.value as UserRole)}
                              className="px-2 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="support">Support</option>
                              <option value="cliente">Cliente</option>
                            </select>
                          </td>
                          <td className="p-4 font-mono text-stone-500">
                            {new Date(u.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-4 text-center">
                            {isSelf ? (
                              <span className="text-[10px] text-stone-400 font-mono uppercase">Tú</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-rose-700 cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
