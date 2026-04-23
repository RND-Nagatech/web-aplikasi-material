import { http, HttpResponse } from "msw";

const BASE = "/api/v1";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const nowGmt7 = () => {
  const gmt7Millis = Date.now() + 7 * 60 * 60 * 1000;
  return `${new Date(gmt7Millis).toISOString().replace("T", " ").slice(0, 19)} GMT+7`;
};
const formatNominalId = (value: number) => new Intl.NumberFormat("id-ID").format(value);

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ApiUser = { _id: string; name: string; email: string; password: string };
type ApiProduct = {
  _id: string;
  nama_produk: string;
  stock_on_hand: number;
  harga_grosir: number;
  harga_ecer: number;
  is_active: boolean;
  created_date: string;
  edited_by: string;
  edited_date: string;
  deleted_by: string;
  deleted_date: string;
  createdAt: string;
  updatedAt: string;
};
type ApiCustomer = {
  _id: string;
  kode_customer?: string;
  nama_customer: string;
  no_hp?: string;
  alamat?: string;
  is_active: boolean;
  created_date: string;
  edited_by: string;
  edited_date: string;
  deleted_by: string;
  deleted_date: string;
  createdAt: string;
  updatedAt: string;
};
type ApiStore = {
  _id: string;
  kode_toko: string;
  nama_toko: string;
  no_hp: string;
  alamat: string;
  created_date: string;
  edited_by: string;
  edited_date: string;
};
type ApiTransactionItem = {
  product: string;
  qty: number;
  price: number;
  subtotal: number;
};
type ApiTransaction = {
  _id: string;
  type: "jual" | "beli";
  type_trx?: string;
  customer?: string;
  nama_customer: string;
  no_hp: string;
  alamat: string;
  kode_customer?: string;
  items: ApiTransactionItem[];
  total: number;
  paid: number;
  status: "lunas" | "utang";
  createdAt: string;
  updatedAt: string;
};
type ApiDebt = {
  _id: string;
  customer?: string;
  nama_customer: string;
  kode_customer?: string;
  transaction: string;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
};
type ApiPayable = {
  _id: string;
  customer?: string;
  nama_customer: string;
  kode_customer?: string;
  transaction: string;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
};

const ok = <T>(message: string, data?: T, status = 200) =>
  HttpResponse.json<ApiEnvelope<T>>({ success: true, message, data }, { status });
const fail = (message: string, status = 400) =>
  HttpResponse.json<ApiEnvelope<never>>({ success: false, message }, { status });

const paginate = <T>(items: T[], url: string): PaginatedData<T> => {
  const u = new URL(url);
  const page = Math.max(1, Number(u.searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(u.searchParams.get("limit") || "10")));
  const start = (page - 1) * limit;
  const sliced = items.slice(start, start + limit);
  return {
    items: sliced,
    total: items.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(items.length / limit)),
  };
};

const db = {
  users: [] as ApiUser[],
  products: [] as ApiProduct[],
  customers: [] as ApiCustomer[],
  stores: [] as ApiStore[],
  transactions: [] as ApiTransaction[],
  debts: [] as ApiDebt[],
  payables: [] as ApiPayable[],
};

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const buildDashboardTrend = (period: 7 | 30) => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period - 1));

  const buckets = new Map<string, { date: string; label: string; penjualan: number; pembelian: number }>();
  for (let offset = 0; offset < period; offset += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + offset);
    const key = formatDateOnly(current);
    buckets.set(key, {
      date: key,
      label: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(current),
      penjualan: 0,
      pembelian: 0,
    });
  }

  db.transactions.forEach((tx) => {
    const createdAt = new Date(tx.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    const key = formatDateOnly(createdAt);
    const bucket = buckets.get(key);
    if (!bucket) return;
    if (tx.type === "jual") bucket.penjualan += tx.total;
    if (tx.type === "beli") bucket.pembelian += tx.total;
  });

  return Array.from(buckets.values());
};

const buildDashboardDue = () => {
  const piutang = db.debts
    .filter((item) => item.remaining > 0)
    .map((item) => {
      const tx = db.transactions.find((row) => row._id === item.transaction && row.type === "jual");
      const createdAt = new Date(item.createdAt);
      const dueDate = Number.isNaN(createdAt.getTime()) ? null : addDays(createdAt, 30);
      return {
        id: item._id,
        no_faktur: tx?._id ?? item.transaction,
        tanggal_transaksi: tx?.createdAt ? formatDateOnly(new Date(tx.createdAt)) : formatDateOnly(createdAt),
        tanggal_jatuh_tempo: dueDate ? formatDateOnly(dueDate) : "-",
        nama_customer: tx?.nama_customer ?? item.nama_customer ?? "-",
        no_hp: tx?.no_hp ?? "-",
        alamat: tx?.alamat ?? "-",
        total: item.total,
        dibayar: item.paid,
        sisa: item.remaining,
      };
    })
    .sort((a, b) => a.tanggal_jatuh_tempo.localeCompare(b.tanggal_jatuh_tempo))
    .slice(0, 10);

  const hutang = db.payables
    .filter((item) => item.remaining > 0)
    .map((item) => {
      const tx = db.transactions.find((row) => row._id === item.transaction && row.type === "beli");
      const createdAt = new Date(item.createdAt);
      const dueDate = Number.isNaN(createdAt.getTime()) ? null : addDays(createdAt, 30);
      return {
        id: item._id,
        no_faktur: tx?._id ?? item.transaction,
        tanggal_transaksi: tx?.createdAt ? formatDateOnly(new Date(tx.createdAt)) : formatDateOnly(createdAt),
        tanggal_jatuh_tempo: dueDate ? formatDateOnly(dueDate) : "-",
        nama_customer: tx?.nama_customer ?? item.nama_customer ?? "-",
        no_hp: tx?.no_hp ?? "-",
        alamat: tx?.alamat ?? "-",
        total: item.total,
        dibayar: item.paid,
        sisa: item.remaining,
      };
    })
    .sort((a, b) => a.tanggal_jatuh_tempo.localeCompare(b.tanggal_jatuh_tempo))
    .slice(0, 10);

  return { piutang, hutang };
};

const storeCodeBase = (raw: string) => {
  const normalized = (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!normalized) return "TOK";
  if (normalized.length >= 3) return normalized.slice(0, 3);
  return normalized.padEnd(3, "X");
};

const nextStoreCode = (name: string) => {
  const base = storeCodeBase(name);
  const matches = db.stores.filter((s) => s.kode_toko === base || s.kode_toko.startsWith(base));
  if (!matches.length) return base;
  let max = 1;
  for (const row of matches) {
    const suffix = row.kode_toko.slice(base.length);
    if (!suffix) {
      max = Math.max(max, 1);
      continue;
    }
    const parsed = Number.parseInt(suffix, 10);
    if (!Number.isNaN(parsed)) max = Math.max(max, parsed);
  }
  const next = max + 1;
  return `${base}${next < 100 ? String(next).padStart(2, "0") : String(next)}`;
};

export const handlers = [
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    if (!name || !email || !password) return fail("name, email, and password are required", 400);
    if (db.users.some((u) => u.email === email)) return fail("Email already registered", 409);

    const user = { _id: uid(), name, email, password };
    db.users.unshift(user);
    return ok(
      "Register successful",
      { token: `mock-jwt-${user._id}`, user: { id: user._id, name: user.name, email: user.email } },
      201,
    );
  }),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; username?: string; password?: string };
    const identifier = (body.email ?? body.username ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();
    if (!identifier || !password) return fail("Email/username and password are required", 400);

    const user = db.users.find((u) => u.email === identifier && u.password === password);
    if (!user) return fail("Invalid email/username or password", 401);

    return ok("Login successful", {
      token: `mock-jwt-${user._id}`,
      user: { id: user._id, name: user.name, email: user.email },
    });
  }),

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return fail("Authorization token missing or malformed", 401);
    const id = auth.replace("Bearer ", "").replace("mock-jwt-", "");
    const user = db.users.find((u) => u._id === id);
    if (!user) return fail("Invalid or expired token", 401);
    return ok("Authenticated user retrieved successfully", {
      id: user._id,
      name: user.name,
      email: user.email,
    });
  }),

  http.get(`${BASE}/products`, ({ request }) => {
    const u = new URL(request.url);
    const search = (u.searchParams.get("search") || "").trim().toLowerCase();
    const activeProducts = db.products.filter((p) => p.is_active);
    const filtered = search
      ? activeProducts.filter((p) => p.nama_produk.toLowerCase().includes(search))
      : activeProducts;
    return ok("Products retrieved successfully", paginate(filtered, request.url));
  }),

  http.post(`${BASE}/products`, async ({ request }) => {
    const body = (await request.json()) as Partial<ApiProduct> & { restore_existing?: boolean };
    if (
      !body.nama_produk
      || body.stock_on_hand === undefined
      || body.harga_grosir === undefined
      || body.harga_ecer === undefined
    ) {
      return fail("nama_produk, stock_on_hand, harga_grosir, and harga_ecer are required", 400);
    }
    const normalizedName = body.nama_produk.trim().toLowerCase();
    const existing = db.products.find((p) => p.nama_produk.trim().toLowerCase() === normalizedName);

    if (existing && existing.is_active) {
      return fail("Nama produk sudah digunakan", 409);
    }

    if (existing && !existing.is_active) {
      if (!body.restore_existing) {
        return fail("RESTORE_CONFIRMATION_REQUIRED", 409);
      }
      existing.stock_on_hand = Number(body.stock_on_hand);
      existing.harga_grosir = Number(body.harga_grosir);
      existing.harga_ecer = Number(body.harga_ecer);
      existing.nama_produk = (body.nama_produk || existing.nama_produk).trim().toUpperCase();
      existing.is_active = true;
      existing.deleted_by = "-";
      existing.deleted_date = "-";
      existing.edited_date = nowGmt7();
      existing.updatedAt = now();
      return ok("Product restored successfully", existing, 200);
    }

    const product: ApiProduct = {
      _id: uid(),
      nama_produk: body.nama_produk.trim().toUpperCase(),
      stock_on_hand: Number(body.stock_on_hand),
      harga_grosir: Number(body.harga_grosir),
      harga_ecer: Number(body.harga_ecer),
      is_active: true,
      created_date: nowGmt7(),
      edited_by: "-",
      edited_date: "-",
      deleted_by: "-",
      deleted_date: "-",
      createdAt: now(),
      updatedAt: now(),
    };
    db.products.unshift(product);
    return ok("Product created successfully", product, 201);
  }),

  http.put(`${BASE}/products/:id`, async ({ params, request }) => {
    const idx = db.products.findIndex((p) => p._id === params.id && p.is_active);
    if (idx === -1) return fail("Product not found", 404);
    const body = (await request.json()) as Partial<ApiProduct>;
    const auth = request.headers.get("authorization");
    const actorId = auth?.startsWith("Bearer ") ? auth.replace("Bearer ", "").replace("mock-jwt-", "") : undefined;
    const actorName = actorId ? db.users.find((u) => u._id === actorId)?.name : undefined;
    db.products[idx] = {
      ...db.products[idx],
      ...body,
      nama_produk: body.nama_produk ? body.nama_produk.trim().toUpperCase() : db.products[idx].nama_produk,
      edited_by: actorName,
      edited_date: nowGmt7(),
      updatedAt: now(),
    };
    return ok("Product updated successfully", db.products[idx]);
  }),

  http.delete(`${BASE}/products/:id`, ({ params, request }) => {
    const idx = db.products.findIndex((p) => p._id === params.id && p.is_active);
    if (idx === -1) return fail("Product not found", 404);
    const auth = request.headers.get("authorization");
    const actorId = auth?.startsWith("Bearer ") ? auth.replace("Bearer ", "").replace("mock-jwt-", "") : undefined;
    const actorName = actorId ? db.users.find((u) => u._id === actorId)?.name : undefined;
    db.products[idx] = {
      ...db.products[idx],
      is_active: false,
      deleted_by: actorName,
      deleted_date: nowGmt7(),
      updatedAt: now(),
    };
    return ok("Product deleted successfully");
  }),

  http.get(`${BASE}/customers`, ({ request }) => {
    const u = new URL(request.url);
    const search = (u.searchParams.get("search") || "").trim().toLowerCase();
    const namaCustomer = (u.searchParams.get("nama_customer") || "").trim().toLowerCase();
    const noHp = (u.searchParams.get("no_hp") || "").trim().toLowerCase();
    const alamat = (u.searchParams.get("alamat") || "").trim().toLowerCase();
    const active = db.customers.filter((c) => c.is_active);
    const filtered = active.filter((c) => {
      const name = (c.nama_customer || "").toLowerCase();
      const phone = (c.no_hp || "").toLowerCase();
      const addr = (c.alamat || "").toLowerCase();
      const kode = (c.kode_customer || "").toLowerCase();
      if (namaCustomer && !name.includes(namaCustomer)) return false;
      if (noHp && !phone.includes(noHp)) return false;
      if (alamat && !addr.includes(alamat)) return false;
      if (search && ![name, phone, addr, kode].some((v) => v.includes(search))) return false;
      return true;
    });
    return ok("Customers retrieved successfully", paginate(filtered, request.url));
  }),

  http.post(`${BASE}/customers`, async ({ request }) => {
    const body = (await request.json()) as Partial<ApiCustomer> & { restore_existing?: boolean };
    if (!body.nama_customer) return fail("nama_customer is required", 400);
    const normalized = (body.nama_customer || "").trim().toLowerCase();
    const existing = db.customers.find((c) => c.nama_customer.trim().toLowerCase() === normalized);

    if (existing && existing.is_active) {
      return fail("Nama customer sudah digunakan", 409);
    }

    if (existing && !existing.is_active) {
      if (!body.restore_existing) return fail("RESTORE_CONFIRMATION_REQUIRED", 409);
      existing.no_hp = body.no_hp || existing.no_hp;
      existing.alamat = body.alamat || existing.alamat;
      existing.is_active = true;
      existing.deleted_by = "-";
      existing.deleted_date = "-";
      existing.edited_by = "-";
      existing.edited_date = nowGmt7();
      existing.updatedAt = now();
      return ok("Customer restored successfully", existing, 200);
    }

    const customer: ApiCustomer = {
      _id: uid(),
      nama_customer: body.nama_customer,
      no_hp: body.no_hp || "",
      alamat: body.alamat || "",
      is_active: true,
      created_date: nowGmt7(),
      edited_by: "-",
      edited_date: "-",
      deleted_by: "-",
      deleted_date: "-",
      createdAt: now(),
      updatedAt: now(),
    };
    db.customers.unshift(customer);
    return ok("Customer created successfully", customer, 201);
  }),

  http.put(`${BASE}/customers/:id`, async ({ params, request }) => {
    const idx = db.customers.findIndex((c) => c._id === params.id && c.is_active);
    if (idx === -1) return fail("Customer not found", 404);
    const body = (await request.json()) as Partial<ApiCustomer>;
    const auth = request.headers.get("authorization");
    const actorId = auth?.startsWith("Bearer ") ? auth.replace("Bearer ", "").replace("mock-jwt-", "") : undefined;
    const actorName = actorId ? db.users.find((u) => u._id === actorId)?.name : undefined;
    db.customers[idx] = {
      ...db.customers[idx],
      ...body,
      edited_by: actorName || db.customers[idx].edited_by,
      edited_date: nowGmt7(),
      updatedAt: now(),
    };
    return ok("Customer updated successfully", db.customers[idx]);
  }),

  http.delete(`${BASE}/customers/:id`, ({ params, request }) => {
    const idx = db.customers.findIndex((c) => c._id === params.id && c.is_active);
    if (idx === -1) return fail("Customer not found", 404);
    const auth = request.headers.get("authorization");
    const actorId = auth?.startsWith("Bearer ") ? auth.replace("Bearer ", "").replace("mock-jwt-", "") : undefined;
    const actorName = actorId ? db.users.find((u) => u._id === actorId)?.name : undefined;
    db.customers[idx] = {
      ...db.customers[idx],
      is_active: false,
      deleted_by: actorName || db.customers[idx].deleted_by,
      deleted_date: nowGmt7(),
      updatedAt: now(),
    };
    return ok("Customer deleted successfully");
  }),

  http.get(`${BASE}/stores`, ({ request }) => {
    const u = new URL(request.url);
    const search = (u.searchParams.get("search") || "").trim().toLowerCase();
    const filtered = search
      ? db.stores.filter((s) => (
        s.nama_toko.toLowerCase().includes(search)
        || s.kode_toko.toLowerCase().includes(search)
        || s.no_hp.toLowerCase().includes(search)
        || s.alamat.toLowerCase().includes(search)
      ))
      : db.stores;
    return ok("Stores retrieved successfully", paginate(filtered, request.url));
  }),

  http.post(`${BASE}/stores`, async ({ request }) => {
    const body = (await request.json()) as Partial<ApiStore>;
    if (!body.nama_toko || !body.no_hp || !body.alamat) {
      return fail("nama_toko, no_hp, and alamat are required", 400);
    }

    const store: ApiStore = {
      _id: uid(),
      kode_toko: nextStoreCode(body.nama_toko),
      nama_toko: body.nama_toko.trim().toUpperCase(),
      no_hp: body.no_hp.trim(),
      alamat: body.alamat.trim().toUpperCase(),
      created_date: nowGmt7(),
      edited_by: "-",
      edited_date: "-",
    };
    db.stores.unshift(store);
    return ok("Store created successfully", store, 201);
  }),

  http.put(`${BASE}/stores/:id`, async ({ params, request }) => {
    const idx = db.stores.findIndex((s) => s._id === params.id);
    if (idx === -1) return fail("Store not found", 404);
    const body = (await request.json()) as Partial<ApiStore>;
    const auth = request.headers.get("authorization");
    const actorId = auth?.startsWith("Bearer ") ? auth.replace("Bearer ", "").replace("mock-jwt-", "") : undefined;
    const actorName = actorId ? db.users.find((u) => u._id === actorId)?.name : undefined;
    db.stores[idx] = {
      ...db.stores[idx],
      nama_toko: body.nama_toko ? body.nama_toko.trim().toUpperCase() : db.stores[idx].nama_toko,
      no_hp: body.no_hp ? body.no_hp.trim() : db.stores[idx].no_hp,
      alamat: body.alamat ? body.alamat.trim().toUpperCase() : db.stores[idx].alamat,
      edited_by: actorName || db.stores[idx].edited_by,
      edited_date: nowGmt7(),
    };
    return ok("Store updated successfully", db.stores[idx]);
  }),

  http.get(`${BASE}/transactions`, ({ request }) => {
    const populated = db.transactions.map((tx) => ({
      ...tx,
      customer: tx.customer
        ? {
            _id: tx.customer,
            nama_customer: db.customers.find((c) => c._id === tx.customer)?.nama_customer || tx.nama_customer,
          }
        : undefined,
      items: tx.items.map((it) => ({
        ...it,
        product: {
          _id: it.product,
          nama_produk: db.products.find((p) => p._id === it.product)?.nama_produk || "",
        },
      })),
    }));
    return ok("Transactions retrieved successfully", paginate(populated, request.url));
  }),

  http.post(`${BASE}/transactions`, async ({ request }) => {
    const body = (await request.json()) as {
      type?: "jual" | "beli";
      customer?: string;
      nama_customer?: string;
      no_hp?: string;
      alamat?: string;
      items?: ApiTransactionItem[];
      total?: number;
      paid?: number;
      dibayar?: number;
    };

    if (!body.type || !["jual", "beli"].includes(body.type)) return fail('type must be either "jual" or "beli"', 400);
    if (!body.customer && !body.nama_customer?.trim()) return fail("customer or nama_customer is required", 400);
    if (!Array.isArray(body.items) || body.items.length === 0) return fail("items must be a non-empty array", 400);
    if (body.total === undefined) return fail("total is required", 400);
    const paid = body.dibayar ?? body.paid ?? 0;
    if (paid < 0) return fail("paid must be a number >= 0", 400);

    for (const item of body.items) {
      const product = db.products.find((p) => p._id === item.product && p.is_active);
      if (!product) return fail(`Product ${item.product} not found`, 404);
      if (body.type === "jual") {
        if (product.stock_on_hand < item.qty) return fail(`Insufficient stock for product: ${product.nama_produk}`, 400);
        product.stock_on_hand -= item.qty;
      } else {
        product.stock_on_hand += item.qty;
      }
      product.updatedAt = now();
    }

    const selectedCustomer = body.customer ? db.customers.find((c) => c._id === body.customer) : undefined;
    const nama_customer = selectedCustomer?.nama_customer ?? body.nama_customer?.trim() ?? "-";
    const no_hp = selectedCustomer?.no_hp ?? body.no_hp?.trim() ?? "-";
    const alamat = selectedCustomer?.alamat ?? body.alamat?.trim() ?? "-";
    const kode_customer = selectedCustomer?._id;

    const tx: ApiTransaction = {
      _id: uid(),
      type: body.type,
      type_trx: (body.type || '').toUpperCase(),
      customer: body.customer,
      nama_customer,
      no_hp: no_hp || "-",
      alamat: alamat || "-",
      kode_customer,
      items: body.items,
      total: body.total,
      paid,
      status: paid < body.total ? "utang" : "lunas",
      createdAt: now(),
      updatedAt: now(),
    };
    db.transactions.unshift(tx);

    const remaining = tx.total - tx.paid;
    if (tx.type === "jual" && remaining > 0) {
      db.debts.unshift({
        _id: uid(),
        customer: tx.customer,
        nama_customer: tx.nama_customer,
        kode_customer: tx.kode_customer,
        transaction: tx._id,
        total: tx.total,
        paid: tx.paid,
        remaining,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    if (tx.type === "beli" && remaining > 0) {
      db.payables.unshift({
        _id: uid(),
        customer: tx.customer,
        nama_customer: tx.nama_customer,
        kode_customer: tx.kode_customer,
        transaction: tx._id,
        total: tx.total,
        paid: tx.paid,
        remaining,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    return ok("Transaction created successfully", tx, 201);
  }),

  http.get(`${BASE}/debts`, ({ request }) => {
    const populated = db.debts.map((d) => ({
      ...d,
      customer: d.customer
        ? {
            _id: d.customer,
            nama_customer: db.customers.find((c) => c._id === d.customer)?.nama_customer || d.nama_customer,
          }
        : undefined,
      customer_name: d.nama_customer,
      transaction: { _id: d.transaction },
    }));
    return ok("Debts retrieved successfully", paginate(populated, request.url));
  }),

  http.post(`${BASE}/debts/payment`, async ({ request }) => {
    const body = (await request.json()) as { debt_id?: string; amount?: number };
    if (!body.debt_id) return fail("debt_id is required", 400);
    if (!body.amount || body.amount <= 0) return fail("amount must be a positive number", 400);
    const debt = db.debts.find((d) => d._id === body.debt_id);
    if (!debt) return fail("Debt record not found", 404);
    if (body.amount > debt.remaining) return fail(`Payment amount exceeds remaining debt of ${debt.remaining}`, 400);

    debt.paid += body.amount;
    debt.remaining -= body.amount;
    debt.updatedAt = now();

    const tx = db.transactions.find((t) => t._id === debt.transaction);
    if (tx) {
      tx.paid = debt.paid;
      tx.status = debt.remaining > 0 ? "utang" : "lunas";
      tx.updatedAt = now();
    }

    return ok("Payment processed successfully", debt);
  }),

  http.get(`${BASE}/payables`, ({ request }) => {
    const populated = db.payables.map((p) => ({
      ...p,
      customer: p.customer
        ? {
            _id: p.customer,
            nama_customer: db.customers.find((c) => c._id === p.customer)?.nama_customer || p.nama_customer,
          }
        : undefined,
      customer_name: p.nama_customer,
      transaction: { _id: p.transaction },
    }));
    return ok("Payables retrieved successfully", paginate(populated, request.url));
  }),

  http.post(`${BASE}/payables/payment`, async ({ request }) => {
    const body = (await request.json()) as { payable_id?: string; amount?: number };
    if (!body.payable_id) return fail("payable_id is required", 400);
    if (!body.amount || body.amount <= 0) return fail("amount must be a positive number", 400);
    const payable = db.payables.find((p) => p._id === body.payable_id);
    if (!payable) return fail("Payable record not found", 404);
    if (body.amount > payable.remaining) return fail(`Payment amount exceeds remaining payable of ${payable.remaining}`, 400);

    payable.paid += body.amount;
    payable.remaining -= body.amount;
    payable.updatedAt = now();

    const tx = db.transactions.find((t) => t._id === payable.transaction);
    if (tx) {
      tx.paid = payable.paid;
      tx.status = payable.remaining > 0 ? "utang" : "lunas";
      tx.updatedAt = now();
    }

    return ok("Payable payment processed successfully", payable);
  }),

  http.get(`${BASE}/dashboard/summary`, ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") === "30" ? 30 : 7;
    return ok("Dashboard summary retrieved successfully", {
      totalProducts: db.products.length,
      totalTransactions: db.transactions.length,
      totalOutstandingDebts: db.debts.reduce((sum, d) => sum + d.remaining, 0),
      totalOutstandingPayables: db.payables.reduce((sum, p) => sum + p.remaining, 0),
      trend: {
        period_days: period,
        items: buildDashboardTrend(period),
      },
      due: buildDashboardDue(),
    });
  }),

  http.get(`${BASE}/reports/stock`, ({ request }) => {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    const parsedFrom = dateFrom ? new Date(dateFrom) : null;
    const parsedTo = dateTo ? new Date(dateTo) : null;
    if (parsedTo) parsedTo.setHours(23, 59, 59, 999);

    const items = db.products
      .filter((item) => item.is_active)
      .filter((item) => {
        const createdAt = new Date(item.createdAt);
        if (parsedFrom && createdAt < parsedFrom) return false;
        if (parsedTo && createdAt > parsedTo) return false;
        return true;
      })
      .sort((a, b) => a.nama_produk.localeCompare(b.nama_produk));
    const summary = items.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.totalStock += item.stock_on_hand;
        acc.totalStockValueWholesale += item.stock_on_hand * item.harga_grosir;
        acc.totalStockValueRetail += item.stock_on_hand * item.harga_ecer;
        return acc;
      },
      { totalItems: 0, totalStock: 0, totalStockValueWholesale: 0, totalStockValueRetail: 0 },
    );
    return ok("Stock report retrieved successfully", { items, summary });
  }),

  http.get(`${BASE}/reports/debts`, ({ request }) => {
    const url = new URL(request.url);
    const dateFromRaw = url.searchParams.get("date_from");
    const dateToRaw = url.searchParams.get("date_to");
    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null;
    const dateTo = dateToRaw ? new Date(dateToRaw) : null;

    const items = db.debts
      .filter((d) => {
        const createdAt = new Date(d.createdAt);
        if (dateFrom && createdAt < dateFrom) return false;
        if (dateTo && createdAt > dateTo) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        customer: d.customer
          ? {
              _id: d.customer,
              nama_customer: db.customers.find((c) => c._id === d.customer)?.nama_customer || d.nama_customer,
            }
          : undefined,
        customer_name: d.nama_customer,
        transaction: { _id: d.transaction },
      }));

    const summary = items.reduce(
      (acc, item) => {
        acc.totalRecords += 1;
        acc.totalDebt += item.total;
        acc.totalPaid += item.paid;
        acc.totalOutstanding += item.remaining;
        return acc;
      },
      { totalRecords: 0, totalDebt: 0, totalPaid: 0, totalOutstanding: 0 },
    );
    return ok("Debt report retrieved successfully", { items, summary });
  }),

  http.get(`${BASE}/reports/payables`, ({ request }) => {
    const url = new URL(request.url);
    const dateFromRaw = url.searchParams.get("date_from");
    const dateToRaw = url.searchParams.get("date_to");
    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null;
    const dateTo = dateToRaw ? new Date(dateToRaw) : null;

    const items = db.payables
      .filter((p) => {
        const createdAt = new Date(p.createdAt);
        if (dateFrom && createdAt < dateFrom) return false;
        if (dateTo && createdAt > dateTo) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        customer: p.customer
          ? {
              _id: p.customer,
              nama_customer: db.customers.find((c) => c._id === p.customer)?.nama_customer || p.nama_customer,
            }
          : undefined,
        customer_name: p.nama_customer,
        transaction: { _id: p.transaction },
      }));
    const summary = items.reduce(
      (acc, item) => {
        acc.totalRecords += 1;
        acc.totalPayable += item.total;
        acc.totalPaid += item.paid;
        acc.totalOutstanding += item.remaining;
        return acc;
      },
      { totalRecords: 0, totalPayable: 0, totalPaid: 0, totalOutstanding: 0 },
    );
    return ok("Payable report retrieved successfully", { items, summary });
  }),

  http.get(`${BASE}/reports/finance`, ({ request }) => {
    const url = new URL(request.url);
    const dateFromRaw = url.searchParams.get("date_from");
    const dateToRaw = url.searchParams.get("date_to");
    const type = (url.searchParams.get("type") || "rekap").toLowerCase();
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();

    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null;
    const dateTo = dateToRaw ? new Date(dateToRaw) : null;
    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    const mapped = db.transactions
      .map((tx) => {
        const kategori = tx.type === "jual" ? "Penjualan" : "Pembelian";
        const fakturPrefix = tx.type === "jual" ? "FJ" : "FB";
        return {
          kategori,
          deskripsi: `${fakturPrefix}-${tx._id.slice(0, 8).toUpperCase()} (Rp ${formatNominalId(tx.total)})`,
          uang_masuk: tx.type === "jual" ? tx.total : 0,
          uang_keluar: tx.type === "beli" ? tx.total : 0,
          created_date: tx.createdAt,
          createdAt: tx.createdAt,
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const saldoAwal = mapped
      .filter((row) => {
        if (!dateFrom) return false;
        return new Date(row.createdAt) < dateFrom;
      })
      .reduce((acc, row) => acc + row.uang_masuk - row.uang_keluar, 0);

    let ranged = mapped.filter((row) => {
      const created = new Date(row.createdAt);
      if (dateFrom && created < dateFrom) return false;
      if (dateTo && created > dateTo) return false;
      return true;
    });

    if (search) {
      ranged = ranged.filter((row) =>
        row.kategori.toLowerCase().includes(search) || row.deskripsi.toLowerCase().includes(search)
      );
    }

    const totalUangMasuk = ranged.reduce((acc, row) => acc + row.uang_masuk, 0);
    const totalUangKeluar = ranged.reduce((acc, row) => acc + row.uang_keluar, 0);
    const saldoAkhir = saldoAwal + totalUangMasuk - totalUangKeluar;

    if (type === "detail") {
      return ok("Finance report retrieved successfully", {
        type: "detail",
        items: ranged.map((row) => ({
          kategori: row.kategori,
          deskripsi: row.deskripsi,
          uang_masuk: row.uang_masuk,
          uang_keluar: row.uang_keluar,
          created_date: row.created_date,
        })),
        summary: {
          saldo_awal: saldoAwal,
          total_uang_masuk: totalUangMasuk,
          total_uang_keluar: totalUangKeluar,
          saldo_akhir: saldoAkhir,
        },
      });
    }

    const penjualanMasuk = ranged
      .filter((row) => row.kategori === "Penjualan")
      .reduce((acc, row) => acc + row.uang_masuk, 0);
    const pembelianKeluar = ranged
      .filter((row) => row.kategori === "Pembelian")
      .reduce((acc, row) => acc + row.uang_keluar, 0);

    return ok("Finance report retrieved successfully", {
      type: "rekap",
      items: [
        { kategori: "Penjualan", deskripsi: "-", uang_masuk: penjualanMasuk, uang_keluar: 0, created_date: "-" },
        { kategori: "Pembelian", deskripsi: "-", uang_masuk: 0, uang_keluar: pembelianKeluar, created_date: "-" },
      ],
      summary: {
        saldo_awal: saldoAwal,
        total_uang_masuk: totalUangMasuk,
        total_uang_keluar: totalUangKeluar,
        saldo_akhir: saldoAkhir,
      },
    });
  }),
];
