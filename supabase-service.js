/**
 * Spanish Starter Pack — Supabase Backend Service
 *
 * ============================================================
 * SETUP — Lee SETUP.md para instrucciones completas
 * ============================================================
 * 1. Crea un proyecto en https://supabase.com
 * 2. Ve a Project Settings → API y copia tu URL y anon key
 * 3. Reemplaza los valores de SUPABASE_URL y SUPABASE_ANON_KEY
 * 4. Activa Google OAuth en Authentication → Providers
 * 5. Corre el SQL de abajo en el SQL Editor de Supabase
 * ============================================================
 *
 * SQL PARA CREAR LAS TABLAS (pegar en Supabase SQL Editor):
 * ============================================================

-- Tabla de lecciones
create table lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text,
  content text,           -- Markdown
  "order" integer default 999,
  status text default 'draft' check (status in ('draft', 'published')),
  tags text[] default '{}',
  author_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de comentarios/feedback en lecciones
create table comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  body text not null,
  approved boolean default false,
  created_at timestamptz default now()
);

-- Tabla de visitas (analytics)
create table page_views (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  page text not null,     -- e.g. 'lesson', 'home', 'lessons'
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);

-- Vista para analytics rápidos por lección
create or replace view lesson_stats as
select
  l.id,
  l.title,
  l.slug,
  l.status,
  l."order",
  count(distinct pv.id) as view_count,
  count(distinct c.id) as comment_count,
  count(distinct c.id) filter (where c.approved = false) as pending_comments
from lessons l
left join page_views pv on pv.lesson_id = l.id
left join comments c on c.lesson_id = l.id
group by l.id, l.title, l.slug, l.status, l."order";

-- Trigger para updated_at automático
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger lessons_updated_at
  before update on lessons
  for each row execute function update_updated_at();

-- RLS (Row Level Security)
alter table lessons enable row level security;
alter table comments enable row level security;
alter table page_views enable row level security;

-- Policies para lecciones
create policy "Anyone can read published lessons"
  on lessons for select
  using (status = 'published');

create policy "Admins can do everything on lessons"
  on lessons for all
  using (auth.jwt() ->> 'email' = any(array['jmteach15@gmail.com']));

-- Policies para comentarios
create policy "Anyone can read approved comments"
  on comments for select
  using (approved = true);

create policy "Anyone can insert a comment"
  on comments for insert
  with check (true);

create policy "Admins can manage all comments"
  on comments for all
  using (auth.jwt() ->> 'email' = any(array['jmteach15@gmail.com']));

-- Policies para page_views
create policy "Anyone can insert a page view"
  on page_views for insert
  with check (true);

create policy "Admins can read page views"
  on page_views for select
  using (auth.jwt() ->> 'email' = any(array['jmteach15@gmail.com']));

-- Permisos en la vista de stats
grant select on lesson_stats to authenticated, anon;

 * ============================================================
 */

// ============================================
// CONFIG — Reemplaza con tus valores reales
// ============================================

const SUPABASE_URL = "https://nobzewkdjmzqeyzozmdb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WIvtYTdwhX-5uEC1TaceEA_1qDZ-H13";

// Emails con acceso al admin
const ADMIN_EMAILS = ["victorj601@gmail.com", "jmteach15@gmail.com"];

// ============================================
// INIT
// ============================================

let supabase;

function initSupabase() {
  // Supabase v2 CDN expone el cliente como window.supabase.createClient
  const sdk = window.supabase;
  if (!sdk || typeof sdk.createClient !== "function") {
    console.error("Supabase SDK no cargado. Revisa los script tags.");
    return false;
  }
  supabase = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Escuchar cambios de auth
  supabase.auth.onAuthStateChange((event, session) => {
    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { user: session?.user ?? null, event },
      }),
    );
  });

  return true;
}

// ============================================
// AUTH SERVICE
// ============================================

const AuthService = {
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/admin.html",
      },
    });
    if (error) throw new Error(error.message);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  isAdmin(user) {
    return user && ADMIN_EMAILS.includes(user.email);
  },
};

// ============================================
// LESSONS SERVICE
// ============================================

const LessonsService = {
  /**
   * Obtener todas las lecciones publicadas
   */
  async getAll(publishedOnly = true) {
    let query = supabase
      .from("lessons")
      .select("*")
      .order("order", { ascending: true });

    if (publishedOnly) {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Obtener una lección por ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  },

  /**
   * Obtener una lección por slug
   */
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    if (error) return null;
    return data;
  },

  /**
   * Crear una nueva lección
   */
  async create(lessonData) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const lesson = {
      title: lessonData.title,
      slug: lessonData.slug || this.generateSlug(lessonData.title),
      summary: lessonData.summary || "",
      content: lessonData.content || "",
      order: lessonData.order || 999,
      status: lessonData.status || "draft",
      tags: lessonData.tags || [],
      author_email: user.email,
    };

    const { data, error } = await supabase
      .from("lessons")
      .insert(lesson)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Actualizar una lección existente
   */
  async update(id, updates) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const { data, error } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Eliminar una lección
   */
  async delete(id) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) throw new Error(error.message);
  },

  /**
   * Cambiar entre published / draft
   */
  async toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    return this.update(id, { status: newStatus });
  },

  /**
   * Reordenar lecciones (recibe array ordenado con id y order)
   */
  async reorder(lessons) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    // Supabase no tiene bulk update nativo, hacemos upsert
    const updates = lessons.map((l, i) => ({ id: l.id, order: i + 1 }));
    const { error } = await supabase.from("lessons").upsert(updates);
    if (error) throw new Error(error.message);
  },

  /**
   * Generar slug URL-friendly desde un título
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  },
};

// ============================================
// COMMENTS SERVICE
// ============================================

const CommentsService = {
  /**
   * Obtener comentarios aprobados de una lección
   */
  async getByLesson(lessonId) {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("approved", true)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Publicar un comentario (requiere aprobación del admin)
   */
  async post(lessonId, { authorName, authorEmail, body }) {
    if (!body?.trim()) throw new Error("El comentario no puede estar vacío");
    if (!authorName?.trim()) throw new Error("Por favor añade tu nombre");

    const { data, error } = await supabase
      .from("comments")
      .insert({
        lesson_id: lessonId,
        author_name: authorName.trim(),
        author_email: authorEmail?.trim() || null,
        body: body.trim(),
        approved: false, // Requiere aprobación
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Obtener TODOS los comentarios (admin: incluye los no aprobados)
   */
  async getAll(approvedOnly = false) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    let query = supabase
      .from("comments")
      .select(`*, lessons(title)`)
      .order("created_at", { ascending: false });

    if (approvedOnly) query = query.eq("approved", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Aprobar o rechazar un comentario
   */
  async approve(id) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const { error } = await supabase
      .from("comments")
      .update({ approved: true })
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  async delete(id) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const { error } = await supabase.from("comments").delete().eq("id", id);

    if (error) throw new Error(error.message);
  },
};

// ============================================
// ANALYTICS SERVICE
// ============================================

const AnalyticsService = {
  /**
   * Registrar una visita a una lección o página
   */
  async trackView(page, lessonId = null) {
    try {
      // Rate limiting simple: no trackear si ya se registró en los últimos 10 min
      const key = `ssp_view_${page}_${lessonId || "none"}`;
      const lastView = localStorage.getItem(key);
      const tenMinutes = 10 * 60 * 1000;
      if (lastView && Date.now() - parseInt(lastView) < tenMinutes) return;

      await supabase.from("page_views").insert({
        lesson_id: lessonId,
        page,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });

      localStorage.setItem(key, Date.now().toString());
    } catch (e) {
      // Analytics nunca debe interrumpir la experiencia del usuario
      console.warn("Analytics error (non-fatal):", e);
    }
  },

  /**
   * Obtener estadísticas generales (solo admin)
   */
  async getStats() {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const [lessonsStats, viewsTotal, viewsByPage, recentViews] =
      await Promise.all([
        // Stats por lección (usa la vista SQL)
        supabase
          .from("lesson_stats")
          .select("*")
          .order("order", { ascending: true }),

        // Total de visitas
        supabase
          .from("page_views")
          .select("id", { count: "exact", head: true }),

        // Visitas agrupadas por página
        supabase.rpc("views_by_page"),

        // Visitas de los últimos 30 días
        supabase
          .from("page_views")
          .select("created_at, page")
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          )
          .order("created_at", { ascending: false }),
      ]);

    return {
      lessons: lessonsStats.data || [],
      totalViews: viewsTotal.count || 0,
      viewsByPage: viewsByPage.data || [],
      recentViews: recentViews.data || [],
    };
  },

  /**
   * Visitas de los últimos N días agrupadas por día (para gráfica)
   */
  async getViewsPerDay(days = 14) {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data, error } = await supabase
      .from("page_views")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) return [];

    // Agrupar por día
    const byDay = {};
    (data || []).forEach((row) => {
      const day = row.created_at.slice(0, 10); // YYYY-MM-DD
      byDay[day] = (byDay[day] || 0) + 1;
    });

    // Rellenar días sin datos
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const day = date.toISOString().slice(0, 10);
      result.push({ date: day, views: byDay[day] || 0 });
    }
    return result;
  },
};

// ============================================
// CONTACT SERVICE
// ============================================

const ContactService = {
  /**
   * Guardar un mensaje del formulario de contacto
   * (Formspree es el handler principal, esto es backup)
   */
  async saveMessage(formData) {
    try {
      // Guardamos en la tabla messages si existe, si no, silently fail
      await supabase.from("messages").insert({
        name: formData.name,
        email: formData.email,
        level: formData.level,
        message: formData.message,
      });
    } catch (e) {
      console.warn("Contact backup save failed (non-fatal):", e);
    }
  },

  async getMessages() {
    const user = await AuthService.getUser();
    if (!AuthService.isAdmin(user)) throw new Error("No autorizado");

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },
};

// ============================================
// AUTO-INIT — Inmediato, no espera DOMContentLoaded
// Garantiza que supabase, AuthService, etc. estén listos
// antes de que admin.html intente usarlos.
// ============================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSupabase);
} else {
  // El DOM ya está listo (script cargado de forma diferida)
  initSupabase();
}
