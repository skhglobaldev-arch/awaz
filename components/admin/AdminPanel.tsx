import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Check,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  LayoutDashboard,
  Layers,
  LogOut,
  PackageCheck,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { AdminGuard } from './AdminGuard';
import { auth, db } from '../../firebase';

type AdminTab = 'overview' | 'orders' | 'customers' | 'suppliers' | 'services' | 'portfolio' | 'admins';

type AnyRecord = Record<string, any>;

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  active?: boolean;
}

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  basePrice: number;
  currency?: 'EUR';
  description?: string;
  active?: boolean;
}

interface AdminMember {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  createdAt?: any;
}

const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'orders', label: 'سفارش ها', icon: PackageCheck },
  { id: 'customers', label: 'مشتری ها', icon: Users },
  { id: 'suppliers', label: 'Supplier', icon: Truck },
  { id: 'services', label: 'خدمات', icon: Briefcase },
  { id: 'portfolio', label: 'Portfolio', icon: Layers },
  { id: 'admins', label: 'ادمین ها', icon: Shield },
];

const orderStatuses = ['awaiting_payment', 'pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'];
const supplierStatuses = ['not_sent', 'sent', 'accepted', 'printing', 'ready', 'completed'];
const permissionOptions = ['orders', 'customers', 'suppliers', 'services', 'portfolio', 'admins'];

const emptyService = { title: '', category: 'print', basePrice: 0, currency: 'EUR' as const, description: '', active: true };
const emptySupplier = { name: '', contact: '', phone: '', email: '', serviceType: 'چاپ عمومی', active: true };
const emptyPortfolio = { title: '', category: 'print', img: '', description: '', active: true };
const isLocalDemoAdmin = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const LOCAL_ORDERS_KEY = 'awazLocalOrders';

const demoSuppliers: Supplier[] = [
  { id: 'sup-1', name: 'چاپخانه پارسه', contact: 'آقای رضایی', phone: '021-44000000', email: 'parseh@demo.test', serviceType: 'افست و بروشور', active: true },
  { id: 'sup-2', name: 'Merch Lab', contact: 'Sara Keller', phone: '+49 30 2200', email: 'merch@demo.test', serviceType: 'هودی، ماگ، تیشرت', active: true },
  { id: 'sup-3', name: 'Laser Print Pro', contact: 'Mina', phone: '021-77880000', email: 'laser@demo.test', serviceType: 'کارت ویزیت و بسته بندی', active: true },
];

const demoOrders: AnyRecord[] = [
  {
    id: 'AWZ-MK-1045',
    userId: 'u3',
    customerCode: 'AWZ-CUSTOM03',
    fullName: 'Brand X',
    phone: '+49 171 0000',
    status: 'awaiting_payment',
    source: 'mockup',
    supplierStatus: 'not_sent',
    assignedSupplierId: 'sup-2',
    totalPrice: 2,
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    templateId: 'mockup-hoodie',
    templateName: 'هودی دورس',
    productId: 'hoodie',
    productName: 'هودی دورس',
    orderType: 'retail',
    quantity: 50,
    paymentStatus: 'unpaid',
    items: [{ name: 'چاپ موکاپ هودی دورس', quantity: 50, type: 'mockup-print' }],
    mockup: {
      productId: 'hoodie',
      productName: 'هودی دورس',
      productCategory: 'پوشاک',
      productImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1200&auto=format&fit=crop',
      hasLogo: true,
      settings: { scale: 0.75, x: 0, y: -5, rotate: 0, opacity: 0.92 },
    },
  },
  { id: 'AWZ-1042', userId: 'u1', customerCode: 'AWZ-CUSTOM01', fullName: 'کافه نوا', phone: '09120000001', status: 'paid', paymentStatus: 'paid', supplierStatus: 'printing', assignedSupplierId: 'sup-3', totalPrice: 33.6, currency: 'EUR', createdAt: new Date().toISOString(), items: [{ name: '۱۰۰۰ کارت ویزیت لمینت' }] },
  { id: 'AWZ-1043', userId: 'u2', customerCode: 'AWZ-CUSTOM02', fullName: 'رستوران زعفران', phone: '09120000002', status: 'in_production', paymentStatus: 'paid', supplierStatus: 'accepted', assignedSupplierId: 'sup-1', totalPrice: 62.4, currency: 'EUR', createdAt: new Date().toISOString(), items: [{ name: 'منوی سه لت + بروشور' }] },
  { id: 'AWZ-1044', userId: 'u3', customerCode: 'AWZ-CUSTOM03', fullName: 'Brand X', phone: '+49 171 0000', status: 'pending', paymentStatus: 'paid', supplierStatus: 'sent', assignedSupplierId: 'sup-2', totalPrice: 148, currency: 'EUR', createdAt: new Date().toISOString(), items: [{ name: '۳۰ هودی چاپ اختصاصی' }] },
];

const demoUsers: AnyRecord[] = [
  { id: 'u1', customerCode: 'AWZ-CUSTOM01', displayName: 'کافه نوا', email: 'cafe@nava.ir' },
  { id: 'u2', customerCode: 'AWZ-CUSTOM02', displayName: 'رستوران زعفران', email: 'info@zaferan.ir' },
  { id: 'u3', customerCode: 'AWZ-CUSTOM03', displayName: 'Brand X', email: 'hello@brandx.de' },
];

const demoDesigns: AnyRecord[] = [
  { id: 'd1', authorUid: 'u1', name: 'لوگو کافه نوا', categoryId: 'cafe_logo', thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=900&auto=format&fit=crop' },
  { id: 'd2', authorUid: 'u2', name: 'منوی رستوران', categoryId: 'restaurant_menu', thumbnail: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=900&auto=format&fit=crop' },
];

const demoServices: ServiceItem[] = [
  { id: 'srv-1', title: 'طراحی لوگو با AI', category: 'branding', basePrice: 23.2, currency: 'EUR', description: 'لوگو آماده چاپ و استفاده دیجیتال', active: true },
  { id: 'srv-2', title: 'چاپ کارت ویزیت', category: 'print', basePrice: 9.6, currency: 'EUR', description: 'کارت ویزیت لمینت و خاص', active: true },
  { id: 'srv-3', title: 'Mockup و چاپ پوشاک', category: 'merch', basePrice: 6.8, currency: 'EUR', description: 'هودی، تیشرت و ماگ', active: true },
];

const demoPortfolio: AnyRecord[] = [
  { id: 'p1', title: 'Cafe Nova Identity', category: 'branding', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop' },
  { id: 'p2', title: 'Restaurant Menu Set', category: 'print', img: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=900&auto=format&fit=crop' },
];

const demoAdmins: AdminMember[] = [
  { id: 'awarvandsara@gmail.com', name: 'Owner', email: 'awarvandsara@gmail.com', role: 'admin', permissions: ['orders', 'customers', 'suppliers', 'services', 'portfolio', 'admins'] },
];

const readLocalOrders = () => {
  if (!isLocalDemoAdmin) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Local order read failed', error);
    return [];
  }
};

const persistLocalOrders = (orders: AnyRecord[]) => {
  if (!isLocalDemoAdmin) return;
  const localOrders = orders.filter((order) => order.localDemoOrder || String(order.id || '').startsWith('ORD-'));
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
};

const getLocalDemoOrders = () => {
  const localOrders = readLocalOrders();
  const localIds = new Set(localOrders.map((order) => order.id));
  return [...localOrders, ...demoOrders.filter((order) => !localIds.has(order.id))];
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const formatDate = (value: any) => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fa-IR');
};

const money = (value: any) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fa-IR', { style: 'currency', currency: 'EUR', currencyDisplay: 'name', minimumFractionDigits: 2 }).format(amount);
};

const toEuro = (value: any, currency?: string) => currency === 'EUR' ? Number(value || 0) : Number(value || 0) / 125000;
const getOrderTotal = (order: AnyRecord) => toEuro(order.totalAmount || order.totalPrice || 0, order.currency);

const isMockupOrder = (order: AnyRecord) => order.source === 'mockup' || Boolean(order.mockup) || String(order.templateId || '').startsWith('mockup-');

const orderTitle = (order: AnyRecord) => {
  if (isMockupOrder(order)) return order.productName || order.mockup?.productName || order.templateName || 'سفارش موکاپ';
  return order.items?.[0]?.name || order.templateName || 'سفارش چاپی';
};

const statusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    pending: 'در انتظار',
    paid: 'پرداخت شده',
    in_production: 'در تولید',
    shipped: 'ارسال شده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
    not_sent: 'ارسال نشده',
    sent: 'ارسال شده',
    accepted: 'پذیرفته شده',
    printing: 'در چاپ',
    ready: 'آماده',
    completed: 'تکمیل شده',
    unpaid: 'پرداخت نشده',
    failed: 'ناموفق',
    refunded: 'برگشت خورده',
    processing: 'در حال تایید',
    awaiting_payment: 'در انتظار پرداخت',
  };
  return labels[status || ''] || status || '-';
};

const Field: React.FC<{
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', placeholder }) => (
  <label className="block">
    <span className="text-xs font-bold text-slate-400">{label}</span>
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
    />
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: any;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="text-xs font-bold text-slate-400">{label}</span>
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ElementType; tone: string }> = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
    <div className="mb-4 flex items-center justify-between">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-sm font-bold text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black text-white">{value}</p>
  </div>
);

export const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<AnyRecord[]>(isLocalDemoAdmin ? getLocalDemoOrders() : []);
  const [users, setUsers] = useState<AnyRecord[]>(isLocalDemoAdmin ? demoUsers : []);
  const [designs, setDesigns] = useState<AnyRecord[]>(isLocalDemoAdmin ? demoDesigns : []);
  const [suppliers, setSuppliers] = useState<Supplier[]>(isLocalDemoAdmin ? demoSuppliers : []);
  const [services, setServices] = useState<ServiceItem[]>(isLocalDemoAdmin ? demoServices : []);
  const [portfolio, setPortfolio] = useState<AnyRecord[]>(isLocalDemoAdmin ? demoPortfolio : []);
  const [admins, setAdmins] = useState<AdminMember[]>(isLocalDemoAdmin ? demoAdmins : []);
  const [aiUsage, setAiUsage] = useState<AnyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(!isLocalDemoAdmin);
  const [message, setMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<AnyRecord | null>(null);
  const [serviceForm, setServiceForm] = useState<any>(emptyService);
  const [supplierForm, setSupplierForm] = useState<any>(emptySupplier);
  const [portfolioForm, setPortfolioForm] = useState<any>(emptyPortfolio);
  const [adminForm, setAdminForm] = useState({ email: '', name: '', permissions: permissionOptions });

  useEffect(() => {
    if (isLocalDemoAdmin) {
      const syncLocalOrders = () => setOrders(getLocalDemoOrders());
      syncLocalOrders();
      window.addEventListener('storage', syncLocalOrders);
      window.addEventListener('awaz:local-order-created', syncLocalOrders as EventListener);
      return () => {
        window.removeEventListener('storage', syncLocalOrders);
        window.removeEventListener('awaz:local-order-created', syncLocalOrders as EventListener);
      };
    }

    const unsubscribers = [
      onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
        setOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      }),
      onSnapshot(collection(db, 'users'), (snapshot) => setUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
      onSnapshot(collection(db, 'designs'), (snapshot) => setDesigns(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
      onSnapshot(collection(db, 'suppliers'), (snapshot) => setSuppliers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Supplier[])),
      onSnapshot(collection(db, 'services'), (snapshot) => setServices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ServiceItem[])),
      onSnapshot(collection(db, 'portfolioItems'), (snapshot) => setPortfolio(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
      onSnapshot(collection(db, 'admins'), (snapshot) => setAdmins(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as AdminMember[])),
      onSnapshot(query(collection(db, 'aiUsage'), orderBy('createdAt', 'desc')), (snapshot) => setAiUsage(snapshot.docs.slice(0, 80).map((item) => ({ id: item.id, ...item.data() })))),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const filteredOrders = useMemo(() => {
    const text = search.trim().toLowerCase();
    return orders.filter((order) => {
      const haystack = `${order.id} ${order.customerCode || ''} ${order.userEmail || ''} ${order.fullName || ''} ${order.phone || ''} ${order.status || ''} ${order.source || ''} ${order.productName || ''} ${order.mockup?.productName || ''}`.toLowerCase();
      return !text || haystack.includes(text);
    });
  }, [orders, search]);

  const supplierStats = useMemo(() => {
    return suppliers.map((supplier) => {
      const supplierOrders = orders.filter((order) => order.assignedSupplierId === supplier.id);
      const completed = supplierOrders.filter((order) => ['completed', 'delivered'].includes(order.supplierStatus || order.status)).length;
      const pending = supplierOrders.length - completed;
      const revenue = supplierOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
      return { ...supplier, totalOrders: supplierOrders.length, completed, pending, revenue };
    });
  }, [orders, suppliers]);

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedUserOrders = selectedUserId ? orders.filter((order) => order.userId === selectedUserId) : [];
  const selectedUserDesigns = selectedUserId ? designs.filter((design) => design.authorUid === selectedUserId || design.userId === selectedUserId) : [];
  const selectedUserAiUsage = selectedUserId ? aiUsage.filter((item) => item.userId === selectedUserId) : [];

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  };

  const saveOrder = async () => {
    if (!editingOrder?.id) return;
    const { id, ...data } = editingOrder;
    if (isLocalDemoAdmin) {
      setOrders((current) => {
        const next = current.map((order) => order.id === id ? { ...order, ...data } : order);
        persistLocalOrders(next);
        return next;
      });
      setEditingOrder(null);
      showMessage('سفارش ذخیره شد.');
      return;
    }
    await updateDoc(doc(db, 'orders', id), {
      ...data,
      totalPrice: Number(data.totalPrice || data.totalAmount || 0),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });
    setEditingOrder(null);
    showMessage('سفارش ذخیره شد.');
  };

  const updateOrder = async (id: string, data: AnyRecord) => {
    if (isLocalDemoAdmin) {
      setOrders((current) => {
        const next = current.map((order) => order.id === id ? { ...order, ...data } : order);
        persistLocalOrders(next);
        return next;
      });
      showMessage('سفارش به روز شد.');
      return;
    }
    await updateDoc(doc(db, 'orders', id), {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || null,
    });
    showMessage('سفارش به روز شد.');
  };

  const removeDoc = async (collectionName: string, id: string, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    if (isLocalDemoAdmin) {
      if (collectionName === 'orders') setOrders((current) => {
        const next = current.filter((item) => item.id !== id);
        persistLocalOrders(next);
        return next;
      });
      if (collectionName === 'suppliers') setSuppliers((current) => current.filter((item) => item.id !== id));
      if (collectionName === 'services') setServices((current) => current.filter((item) => item.id !== id));
      if (collectionName === 'portfolioItems') setPortfolio((current) => current.filter((item) => item.id !== id));
      if (collectionName === 'admins') setAdmins((current) => current.filter((item) => item.id !== id));
      showMessage('حذف شد.');
      return;
    }
    await deleteDoc(doc(db, collectionName, id));
    showMessage('حذف شد.');
  };

  const saveService = async () => {
    if (!serviceForm.title) return;
    const { id, ...data } = serviceForm;
    const payload = { ...data, basePrice: Number(data.basePrice || 0), currency: 'EUR', updatedAt: serverTimestamp() };
    if (isLocalDemoAdmin) {
      setServices((current) => id
        ? current.map((item) => item.id === id ? { id, ...data, basePrice: Number(data.basePrice || 0), currency: 'EUR' } : item)
        : [{ id: `srv-${Date.now()}`, ...data, basePrice: Number(data.basePrice || 0), currency: 'EUR' }, ...current]);
      setServiceForm(emptyService);
      showMessage('خدمت ذخیره شد.');
      return;
    }
    if (id) {
      await updateDoc(doc(db, 'services', id), payload);
    } else {
      await addDoc(collection(db, 'services'), { ...payload, createdAt: serverTimestamp() });
    }
    setServiceForm(emptyService);
    showMessage('خدمت ذخیره شد.');
  };

  const saveSupplier = async () => {
    if (!supplierForm.name) return;
    const { id, ...data } = supplierForm;
    if (isLocalDemoAdmin) {
      setSuppliers((current) => id
        ? current.map((item) => item.id === id ? { id, ...data } : item)
        : [{ id: `sup-${Date.now()}`, ...data }, ...current]);
      setSupplierForm(emptySupplier);
      showMessage('Supplier ذخیره شد.');
      return;
    }
    if (id) {
      await updateDoc(doc(db, 'suppliers', id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() });
    }
    setSupplierForm(emptySupplier);
    showMessage('Supplier ذخیره شد.');
  };

  const savePortfolio = async () => {
    if (!portfolioForm.title) return;
    const { id, ...data } = portfolioForm;
    if (isLocalDemoAdmin) {
      setPortfolio((current) => id
        ? current.map((item) => item.id === id ? { id, ...data } : item)
        : [{ id: `port-${Date.now()}`, ...data }, ...current]);
      setPortfolioForm(emptyPortfolio);
      showMessage('Portfolio ذخیره شد.');
      return;
    }
    if (id) {
      await updateDoc(doc(db, 'portfolioItems', id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'portfolioItems'), { ...data, createdAt: serverTimestamp() });
    }
    setPortfolioForm(emptyPortfolio);
    showMessage('Portfolio ذخیره شد.');
  };

  const saveAdmin = async () => {
    const email = normalizeEmail(adminForm.email);
    if (!email) return;
    if (isLocalDemoAdmin) {
      setAdmins((current) => [{ id: email, email, name: adminForm.name, role: 'admin', permissions: adminForm.permissions }, ...current]);
      setAdminForm({ email: '', name: '', permissions: permissionOptions });
      showMessage('دسترسی ادمین اضافه شد.');
      return;
    }
    await setDoc(doc(db, 'admins', email), {
      email,
      name: adminForm.name,
      role: 'admin',
      permissions: adminForm.permissions,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
    }, { merge: true });
    setAdminForm({ email: '', name: '', permissions: permissionOptions });
    showMessage('دسترسی ادمین اضافه شد.');
  };

  const renderOverview = () => {
    const revenue = orders.filter((order) => order.paymentStatus === 'paid').reduce((sum, order) => sum + getOrderTotal(order), 0);
    const pending = orders.filter((order) => ['pending', 'paid', 'in_production'].includes(order.status)).length;
    const completed = orders.filter((order) => ['delivered', 'completed'].includes(order.status)).length;
    const aiCreditsUsed = aiUsage.reduce((sum, item) => sum + Number(item.cost || 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="کل سفارش ها" value={orders.length} icon={PackageCheck} tone="bg-blue-500/15 text-blue-300" />
          <StatCard label="در انتظار/تولید" value={pending} icon={Clock} tone="bg-amber-500/15 text-amber-300" />
          <StatCard label="تکمیل شده" value={completed} icon={Check} tone="bg-emerald-500/15 text-emerald-300" />
          <StatCard label="AI Credit مصرف شده" value={aiCreditsUsed} icon={Wand2} tone="bg-cyan-500/15 text-cyan-300" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard label="پرداخت تایید شده" value={money(revenue)} icon={DollarSign} tone="bg-violet-500/15 text-violet-300" />
          <StatCard label="AI Request" value={aiUsage.length} icon={Wand2} tone="bg-fuchsia-500/15 text-fuchsia-300" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-4 text-lg font-black text-white">سفارش های اخیر</h2>
            <div className="space-y-3">
              {orders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">{order.fullName || 'مشتری'}</p>
                      {isMockupOrder(order) && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black text-blue-200">Mockup</span>}
                    </div>
                    <p className="text-xs text-slate-400">{orderTitle(order)} - {formatDate(order.createdAt)} - {statusLabel(order.status)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-200">{money(getOrderTotal(order))}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-4 text-lg font-black text-white">عملکرد Supplierها</h2>
            <div className="space-y-3">
              {supplierStats.slice(0, 6).map((supplier) => (
                <div key={supplier.id} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-white">{supplier.name}</p>
                    <p className="text-xs text-slate-400">{supplier.completed} انجام شده / {supplier.pending} pending</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{money(supplier.revenue)}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
            <h2 className="mb-4 text-lg font-black text-white">AI Usage اخیر</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {aiUsage.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-white">{item.task}</p>
                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs font-black text-cyan-200">{item.cost} credit</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.userEmail || item.customerCode || item.userId} - {statusLabel(item.status)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderOrders = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-black text-white">مدیریت سفارش ها</h2>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو نام، ایمیل، کد مشتری..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-4 pr-10 text-sm text-white outline-none md:w-72"
            />
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {filteredOrders.map((order) => (
            <div key={order.id} className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto] lg:items-center">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-black text-white">{order.fullName || 'مشتری'}</p>
                  {isMockupOrder(order) && <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-black text-blue-200">سفارش Mockup</span>}
                  {order.paymentStatus && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-black text-amber-200">پرداخت: {statusLabel(order.paymentStatus)}</span>}
                </div>
                <p className="text-sm font-bold text-slate-200">{orderTitle(order)}</p>
                <p className="text-xs text-slate-400">#{order.id.slice(-8)} - {formatDate(order.createdAt)} - {order.phone || '-'}</p>
                <p className="text-xs text-blue-300">{order.customerCode || '-'} - {order.userEmail || 'بدون ایمیل'} - {money(getOrderTotal(order))}</p>
                {isMockupOrder(order) && (
                  <div className="mt-2 rounded-xl border border-blue-400/15 bg-blue-400/5 p-3 text-xs leading-6 text-blue-100">
                    محصول: {order.mockup?.productName || order.productName || '-'} | دسته: {order.mockup?.productCategory || '-'} | فایل لوگو: {order.mockup?.hasLogo || order.mockup?.logo ? 'دارد' : 'ندارد'}
                  </div>
                )}
              </div>
              <SelectField
                label="وضعیت سفارش"
                value={order.status || 'pending'}
                onChange={(value) => updateOrder(order.id, { status: value })}
                options={orderStatuses.map((item) => ({ value: item, label: statusLabel(item) }))}
              />
              <SelectField
                label="ارسال به Supplier"
                value={order.assignedSupplierId || ''}
                onChange={(value) => updateOrder(order.id, {
                  assignedSupplierId: value || null,
                  supplierStatus: value ? 'sent' : 'not_sent',
                  supplierAssignedAt: value ? serverTimestamp() : null,
                })}
                options={[{ value: '', label: 'انتخاب نشده' }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]}
              />
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingOrder(order)} className="rounded-xl bg-white/10 p-3 text-white hover:bg-white/15" title="ویرایش">
                  <Edit3 size={18} />
                </button>
                <button onClick={() => removeDoc('orders', order.id, 'این سفارش حذف شود؟')} className="rounded-xl bg-red-500/10 p-3 text-red-300 hover:bg-red-500/20" title="حذف">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        {editingOrder ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">ویرایش سفارش</h3>
              <button onClick={() => setEditingOrder(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <Field label="نام مشتری" value={editingOrder.fullName} onChange={(value) => setEditingOrder({ ...editingOrder, fullName: value })} />
            <Field label="تلفن" value={editingOrder.phone} onChange={(value) => setEditingOrder({ ...editingOrder, phone: value })} />
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
              <p>مبلغ پرداخت: <span className="font-black text-white">{money(getOrderTotal(editingOrder))}</span></p>
              <p className="mt-1">وضعیت: <span className="font-bold">{statusLabel(editingOrder.paymentStatus)}</span></p>
              <p className="mt-1 text-xs text-slate-400">کد مشتری: {editingOrder.customerCode || '-'} | Stripe: {editingOrder.stripePaymentIntentId || '-'}</p>
            </div>
            <Field label="آدرس ارسال" value={editingOrder.address} onChange={(value) => setEditingOrder({ ...editingOrder, address: value })} />
            {isMockupOrder(editingOrder) && (
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-blue-100">جزئیات سفارش موکاپ</p>
                    <p className="text-xs text-blue-200/80">{editingOrder.mockup?.productName || editingOrder.productName || editingOrder.templateName}</p>
                  </div>
                  <span className="rounded-full bg-blue-500/30 px-3 py-1 text-[10px] font-black text-white">Mockup</span>
                </div>
                {editingOrder.mockup?.logo && (
                  <img src={editingOrder.mockup.logo} alt="mockup logo" className="mb-3 h-24 w-full rounded-xl bg-white object-contain p-3" />
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-50">
                  <div className="rounded-xl bg-white/10 p-2">محصول: {editingOrder.mockup?.productName || '-'}</div>
                  <div className="rounded-xl bg-white/10 p-2">دسته: {editingOrder.mockup?.productCategory || '-'}</div>
                  <div className="rounded-xl bg-white/10 p-2">Scale: {editingOrder.mockup?.settings?.scale ?? '-'}</div>
                  <div className="rounded-xl bg-white/10 p-2">Rotate: {editingOrder.mockup?.settings?.rotate ?? 0}</div>
                </div>
              </div>
            )}
            <SelectField label="وضعیت" value={editingOrder.status || 'pending'} onChange={(value) => setEditingOrder({ ...editingOrder, status: value })} options={orderStatuses.map((item) => ({ value: item, label: statusLabel(item) }))} />
            <SelectField label="وضعیت Supplier" value={editingOrder.supplierStatus || 'not_sent'} onChange={(value) => setEditingOrder({ ...editingOrder, supplierStatus: value })} options={supplierStatuses.map((item) => ({ value: item, label: statusLabel(item) }))} />
            <label className="block">
              <span className="text-xs font-bold text-slate-400">یادداشت ادمین</span>
              <textarea
                value={editingOrder.adminNote || ''}
                onChange={(event) => setEditingOrder({ ...editingOrder, adminNote: event.target.value })}
                className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
              />
            </label>
            <button onClick={saveOrder} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black text-white hover:bg-blue-500">
              <Save size={18} /> ذخیره
            </button>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">
            <Eye className="mx-auto mb-3 text-slate-600" size={34} />
            یک سفارش را برای ویرایش انتخاب کنید.
          </div>
        )}
      </aside>
    </div>
  );

  const renderCustomers = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="mb-4 text-xl font-black text-white">مشتری ها</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full rounded-xl p-3 text-right transition ${selectedUserId === user.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
            >
              <p className="font-black">{user.displayName || user.name || user.email || user.id}</p>
              <p className="text-xs opacity-75">{user.email || user.id}</p>
              <p className="text-xs font-bold text-blue-200">{user.customerCode || '-'}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        {selectedUser ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">{selectedUser.displayName || selectedUser.email || 'مشتری'}</h2>
              <p className="text-sm text-slate-400">{selectedUser.email || selectedUser.id}</p>
              <p className="mt-1 text-sm font-bold text-blue-300">کد مشتری: {selectedUser.customerCode || '-'}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="سفارش ها" value={selectedUserOrders.length} icon={PackageCheck} tone="bg-blue-500/15 text-blue-300" />
              <StatCard label="طرح ها" value={selectedUserDesigns.length} icon={Wand2} tone="bg-violet-500/15 text-violet-300" />
              <StatCard label="مجموع خرید" value={money(selectedUserOrders.reduce((sum, order) => sum + getOrderTotal(order), 0))} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
              <StatCard label="AI Credit باقی مانده" value={selectedUser.aiCreditsBalance ?? 0} icon={Wand2} tone="bg-cyan-500/15 text-cyan-300" />
              <StatCard label="AI Credit مصرف شده" value={selectedUser.aiCreditsTotalUsed ?? 0} icon={Wand2} tone="bg-fuchsia-500/15 text-fuchsia-300" />
              <StatCard label="AI Plan" value={selectedUser.aiPlan || 'free'} icon={Shield} tone="bg-amber-500/15 text-amber-300" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {selectedUserOrders.map((order) => (
                <div key={order.id} className="rounded-xl bg-white/5 p-4">
                  <p className="font-black text-white">#{order.id.slice(-8)} - {statusLabel(order.status)}</p>
                  <p className="text-sm text-slate-400">{formatDate(order.createdAt)} - {money(getOrderTotal(order))}</p>
                </div>
              ))}
              {selectedUserDesigns.map((design) => (
                <div key={design.id} className="rounded-xl bg-white/5 p-4">
                  <p className="font-black text-white">{design.name || design.title || 'طرح'}</p>
                  <p className="text-sm text-slate-400">{formatDate(design.createdAt)}</p>
                </div>
              ))}
              {selectedUserAiUsage.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl bg-cyan-400/5 p-4">
                  <p className="font-black text-white">AI: {item.task} - {item.cost} credit</p>
                  <p className="text-sm text-slate-400">{formatDate(item.createdAt)} - {statusLabel(item.status)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">یک مشتری را انتخاب کنید تا داشبورد و سفارش هایش را ببینید.</div>
        )}
      </section>
    </div>
  );

  const renderSuppliers = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-4 text-xl font-black text-white">{supplierForm.id ? 'ویرایش Supplier' : 'افزودن Supplier'}</h2>
        <div className="space-y-4">
          <Field label="نام چاپخانه / Supplier" value={supplierForm.name} onChange={(value) => setSupplierForm({ ...supplierForm, name: value })} />
          <Field label="شخص تماس" value={supplierForm.contact} onChange={(value) => setSupplierForm({ ...supplierForm, contact: value })} />
          <Field label="تلفن" value={supplierForm.phone} onChange={(value) => setSupplierForm({ ...supplierForm, phone: value })} />
          <Field label="ایمیل" value={supplierForm.email} onChange={(value) => setSupplierForm({ ...supplierForm, email: value })} />
          <Field label="نوع خدمات" value={supplierForm.serviceType} onChange={(value) => setSupplierForm({ ...supplierForm, serviceType: value })} />
          <button onClick={saveSupplier} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black text-white hover:bg-blue-500">
            <Plus size={18} /> ذخیره Supplier
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {supplierStats.map((supplier) => (
          <div key={supplier.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white">{supplier.name}</h3>
                <p className="text-sm text-slate-400">{supplier.serviceType} - {supplier.phone || supplier.email || '-'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSupplierForm(supplier)} className="rounded-xl bg-white/10 p-2 text-white"><Edit3 size={16} /></button>
                <button onClick={() => removeDoc('suppliers', supplier.id, 'این supplier حذف شود؟')} className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">کل سفارش</p><p className="font-black text-white">{supplier.totalOrders}</p></div>
              <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">Pending</p><p className="font-black text-white">{supplier.pending}</p></div>
              <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">Completed</p><p className="font-black text-white">{supplier.completed}</p></div>
              <div className="rounded-xl bg-white/5 p-3"><p className="text-slate-400">درآمد</p><p className="font-black text-white">{money(supplier.revenue)}</p></div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderServices = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-4 text-xl font-black text-white">{serviceForm.id ? 'ویرایش خدمت' : 'افزودن خدمت'}</h2>
        <div className="space-y-4">
          <Field label="عنوان" value={serviceForm.title} onChange={(value) => setServiceForm({ ...serviceForm, title: value })} />
          <Field label="دسته بندی" value={serviceForm.category} onChange={(value) => setServiceForm({ ...serviceForm, category: value })} />
          <Field label="قیمت پایه (EUR)" type="number" value={serviceForm.basePrice} onChange={(value) => setServiceForm({ ...serviceForm, basePrice: value })} />
          <Field label="توضیح" value={serviceForm.description} onChange={(value) => setServiceForm({ ...serviceForm, description: value })} />
          <button onClick={saveService} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black text-white hover:bg-blue-500">
            <Save size={18} /> ذخیره خدمت
          </button>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <div key={service.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-white">{service.title}</h3>
                <p className="text-sm text-slate-400">{service.category} - {money(toEuro(service.basePrice, service.currency))}</p>
                <p className="mt-2 text-sm text-slate-300">{service.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setServiceForm(service)} className="rounded-xl bg-white/10 p-2 text-white"><Edit3 size={16} /></button>
                <button onClick={() => removeDoc('services', service.id, 'این خدمت حذف شود؟')} className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderPortfolio = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-4 text-xl font-black text-white">{portfolioForm.id ? 'ویرایش Portfolio' : 'افزودن Portfolio'}</h2>
        <div className="space-y-4">
          <Field label="عنوان" value={portfolioForm.title} onChange={(value) => setPortfolioForm({ ...portfolioForm, title: value })} />
          <Field label="دسته بندی" value={portfolioForm.category} onChange={(value) => setPortfolioForm({ ...portfolioForm, category: value })} />
          <Field label="لینک تصویر" value={portfolioForm.img} onChange={(value) => setPortfolioForm({ ...portfolioForm, img: value })} />
          <Field label="توضیح" value={portfolioForm.description} onChange={(value) => setPortfolioForm({ ...portfolioForm, description: value })} />
          <button onClick={savePortfolio} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black text-white hover:bg-blue-500">
            <Save size={18} /> ذخیره Portfolio
          </button>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...portfolio, ...designs].map((item) => (
          <div key={`${item.id}-${item.title || item.name}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            {(item.img || item.thumbnail) && <img src={item.img || item.thumbnail} alt="" className="h-44 w-full object-cover" />}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-white">{item.title || item.name || 'طرح'}</h3>
                  <p className="text-sm text-slate-400">{item.category || item.categoryId || '-'}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                </div>
                {portfolio.some((portfolioItem) => portfolioItem.id === item.id) && (
                  <div className="flex gap-2">
                    <button onClick={() => setPortfolioForm(item)} className="rounded-xl bg-white/10 p-2 text-white"><Edit3 size={16} /></button>
                    <button onClick={() => removeDoc('portfolioItems', item.id, 'این آیتم حذف شود؟')} className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderAdmins = () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-4 text-xl font-black text-white">افزودن ادمین</h2>
        <div className="space-y-4">
          <Field label="ایمیل" value={adminForm.email} onChange={(value) => setAdminForm({ ...adminForm, email: value })} placeholder="name@example.com" />
          <Field label="نام" value={adminForm.name} onChange={(value) => setAdminForm({ ...adminForm, name: value })} />
          <div>
            <p className="mb-2 text-xs font-bold text-slate-400">دسترسی ها</p>
            <div className="grid grid-cols-2 gap-2">
              {permissionOptions.map((permission) => {
                const checked = adminForm.permissions.includes(permission);
                return (
                  <button
                    key={permission}
                    onClick={() => setAdminForm({
                      ...adminForm,
                      permissions: checked
                        ? adminForm.permissions.filter((item) => item !== permission)
                        : [...adminForm.permissions, permission],
                    })}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${checked ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300'}`}
                  >
                    {permission}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={saveAdmin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black text-white hover:bg-blue-500">
            <UserPlus size={18} /> افزودن ادمین
          </button>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {admins.map((admin) => (
          <div key={admin.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-white">{admin.name || admin.email || admin.id}</h3>
                <p className="text-sm text-slate-400">{admin.email || admin.id}</p>
                <p className="mt-2 text-xs text-slate-300">دسترسی: {(admin.permissions || []).join(', ') || 'همه'}</p>
              </div>
              <button onClick={() => removeDoc('admins', admin.id, 'این ادمین حذف شود؟')} className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderActiveTab = () => {
    if (loading) {
      return (
        <div className="flex min-h-96 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
          در حال دریافت اطلاعات...
        </div>
      );
    }
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'orders': return renderOrders();
      case 'customers': return renderCustomers();
      case 'suppliers': return renderSuppliers();
      case 'services': return renderServices();
      case 'portfolio': return renderPortfolio();
      case 'admins': return renderAdmins();
      default: return null;
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                  <Shield size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white">پنل مدیریت Awaz</h1>
                  <p className="text-sm text-slate-400">مدیریت سفارش، مشتری، خدمات، طرح ها و supplierها</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {message && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">
                  <Check size={16} /> {message}
                </div>
              )}
              <button onClick={() => signOut(auth)} className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 font-bold text-red-200 hover:bg-red-500/15">
                <LogOut size={18} /> خروج از ادمین
              </button>
              <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-bold text-white hover:bg-white/15">
                <ArrowLeft size={18} /> بازگشت به سایت
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:sticky lg:top-24">
            <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition lg:justify-start ${
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
              <div className="mb-1 flex items-center gap-2 font-black">
                <AlertCircle size={14} /> نکته
              </div>
              دسترسی ها از Firestore rules کنترل می شوند؛ برای تولید، قوانین را deploy کنید.
            </div>
          </aside>

          <section>{renderActiveTab()}</section>
        </main>
      </div>
    </AdminGuard>
  );
};
