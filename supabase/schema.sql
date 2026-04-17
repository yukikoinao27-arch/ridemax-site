-- Ridemax Supabase schema (Wix-like collections)
-- Normalized tables for CMS content (departments, jobs, news, events, awards, brands, catalog, etc.)
-- plus a contact inbox table. Follows AGENTS.md "Rules of Thumb for Database Design":
-- - Primary key is a single `id` column (uuid) for nearly all tables
-- - Avoid duplicate/dependent data where possible; use join tables for lists/arrays

create extension if not exists pgcrypto;

-- Core site settings (single row in practice).
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'Team Ridemax',
  logo_src text not null default '/ridemax-logo.svg',
  search_placeholder text not null default 'Search...',
  footer_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Navigation (Wix-like menu tree).
create table if not exists public.navigation_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid null references public.navigation_links(id) on delete cascade,
  label text not null,
  href text not null,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contact settings (single row in practice).
create table if not exists public.contact_settings (
  id uuid primary key default gen_random_uuid(),
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  map_query text not null default '',
  map_zoom int not null default 15,
  intro text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shared CMS bundle for the block-based page builder and first-class collections.
create table if not exists public.site_content_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  href text not null,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Page content tables (single row in practice).
create table if not exists public.home_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  hero_title text not null default '',
  hero_summary text not null default '',
  brand_rail_title text not null default '',
  brand_rail_summary text not null default '',
  brand_motion_direction text not null default 'right-to-left',
  browse_title text not null default '',
  browse_summary text not null default '',
  brand_spotlight_title text not null default '',
  brand_spotlight_summary text not null default '',
  whats_new_title text not null default '',
  whats_new_summary text not null default '',
  upcoming_events_title text not null default '',
  upcoming_events_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  title text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.careers_page (
  id uuid primary key default gen_random_uuid(),
  hero_title text not null default '',
  hero_summary text not null default '',
  gallery_motion_direction text not null default 'right-to-left',
  why_join_label text not null default '',
  why_join_title text not null default '',
  why_join_accent text not null default '',
  showcase_image text not null default '',
  jobs_intro text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.careers_gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_src text not null,
  sort_order int not null default 1
);

create table if not exists public.careers_why_join_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  sort_order int not null default 1
);

create table if not exists public.about_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  title text not null default '',
  summary text not null default '',
  contact_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.about_story_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  sort_order int not null default 1
);

create table if not exists public.events_awards_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  title text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  title text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  title text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.awards_page (
  id uuid primary key default gen_random_uuid(),
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  title text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Collections.
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  published boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  department_id uuid not null references public.departments(id) on delete restrict,
  title text not null,
  location text not null default '',
  type text not null default '',
  summary text not null default '',
  description text not null default '',
  published boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  summary text not null default '',
  image text not null default '',
  published boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  teaser_date text not null default '',
  location text not null default '',
  venue text not null default '',
  start_at timestamptz not null default now(),
  end_at timestamptz not null default now(),
  summary text not null default '',
  description text not null default '',
  image text not null default '',
  detail_image text not null default '',
  published boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 1,
  share_facebook text not null default '',
  share_x text not null default '',
  share_linkedin text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  year text not null default '',
  title text not null,
  summary text not null default '',
  image text not null default '',
  published boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_features (
  id uuid primary key default gen_random_uuid(),
  number_label text not null default '',
  title text not null,
  summary text not null default '',
  image text not null default '',
  href text not null default '',
  published boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  title text not null,
  summary text not null default '',
  image text not null default '',
  href text not null default '',
  category_slug text not null default '',
  published boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_tags (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  tag text not null,
  sort_order int not null default 1
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  hero_title text not null default '',
  hero_summary text not null default '',
  hero_image_src text not null default '',
  hero_image_alt text not null default '',
  featured_image text not null default '',
  browse_title text not null default '',
  browse_summary text not null default '',
  section_title text not null default '',
  section_summary text not null default '',
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_sections (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  slug text not null,
  title text not null,
  subtitle text null,
  image text null,
  image_alt text null,
  published boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table if not exists public.section_paragraphs (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.category_sections(id) on delete cascade,
  paragraph text not null,
  sort_order int not null default 1
);

create table if not exists public.product_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  slug text not null,
  brand text not null default '',
  title text not null,
  summary text not null default '',
  description text not null default '',
  sku text not null default '',
  image text not null default '',
  published boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table if not exists public.product_item_highlights (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.product_items(id) on delete cascade,
  highlight text not null,
  sort_order int not null default 1
);

create table if not exists public.product_item_gallery (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.product_items(id) on delete cascade,
  image_src text not null,
  sort_order int not null default 1
);

create table if not exists public.product_item_sizes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.product_items(id) on delete cascade,
  size text not null,
  sort_order int not null default 1
);

create table if not exists public.product_item_tags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.product_items(id) on delete cascade,
  tag text not null,
  sort_order int not null default 1
);

create table if not exists public.product_item_search_keywords (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.product_items(id) on delete cascade,
  keyword text not null,
  sort_order int not null default 1
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- storage_mode values: 's3' | 'supabase' | 'local'.
-- The Supabase Storage bucket (default name: "media") is created on first
-- upload by lib/server/media-library.ts, so no manual provisioning is
-- required — but operators may pre-create it to set custom RLS / CORS.
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  public_url text not null,
  content_type text not null,
  byte_size int not null default 0,
  width int not null default 0,
  height int not null default 0,
  storage_key text not null unique,
  storage_mode text not null default 'local',
  created_at timestamptz not null default now()
);

-- Promotions collection. Mirrors data/site-content.json's promotionItem shape
-- so the migration from the JSON bundle to relational rows is mechanical.
-- Defined here (alongside other content tables) so the manage-policies loop
-- below sees it in the catalog when it runs.
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  video_url text not null,
  thumbnail text not null default '',
  publish_date date null,
  cta_label text not null default '',
  cta_href text not null default '',
  published boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotion_tags (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  tag text not null,
  sort_order int not null default 1
);

-- Audit log for the anonymous /api/chat-upload endpoint. Lets ops trace
-- abuse back to an IP/UA without parsing access logs, and lets the chat
-- backend later attach uploads to a conversation thread.
create table if not exists public.chat_uploads (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null,
  public_url text not null,
  byte_size int not null default 0,
  client_ip text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- updated_at triggers
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_site_settings_updated_at') then
    create trigger trg_site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_navigation_links_updated_at') then
    create trigger trg_navigation_links_updated_at before update on public.navigation_links for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_contact_settings_updated_at') then
    create trigger trg_contact_settings_updated_at before update on public.contact_settings for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_site_content_documents_updated_at') then
    create trigger trg_site_content_documents_updated_at before update on public.site_content_documents for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_home_page_updated_at') then
    create trigger trg_home_page_updated_at before update on public.home_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_products_page_updated_at') then
    create trigger trg_products_page_updated_at before update on public.products_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_careers_page_updated_at') then
    create trigger trg_careers_page_updated_at before update on public.careers_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_about_page_updated_at') then
    create trigger trg_about_page_updated_at before update on public.about_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_events_awards_page_updated_at') then
    create trigger trg_events_awards_page_updated_at before update on public.events_awards_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_news_page_updated_at') then
    create trigger trg_news_page_updated_at before update on public.news_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_events_page_updated_at') then
    create trigger trg_events_page_updated_at before update on public.events_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_awards_page_updated_at') then
    create trigger trg_awards_page_updated_at before update on public.awards_page for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_departments_updated_at') then
    create trigger trg_departments_updated_at before update on public.departments for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_jobs_updated_at') then
    create trigger trg_jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_news_items_updated_at') then
    create trigger trg_news_items_updated_at before update on public.news_items for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_events_updated_at') then
    create trigger trg_events_updated_at before update on public.events for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_awards_updated_at') then
    create trigger trg_awards_updated_at before update on public.awards for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_project_features_updated_at') then
    create trigger trg_project_features_updated_at before update on public.project_features for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_brands_updated_at') then
    create trigger trg_brands_updated_at before update on public.brands for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_product_categories_updated_at') then
    create trigger trg_product_categories_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_category_sections_updated_at') then
    create trigger trg_category_sections_updated_at before update on public.category_sections for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_product_items_updated_at') then
    create trigger trg_product_items_updated_at before update on public.product_items for each row execute function public.set_updated_at();
  end if;
end $$;

-- Seed singleton rows (id is generated; we just ensure one exists).
insert into public.site_settings (site_name)
select 'Team Ridemax'
where not exists (select 1 from public.site_settings);

insert into public.contact_settings (email)
select 'teamridemaxphilippines@gmail.com'
where not exists (select 1 from public.contact_settings);

alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;
alter table public.navigation_links enable row level security;
alter table public.contact_settings enable row level security;
alter table public.site_content_documents enable row level security;
alter table public.social_links enable row level security;
alter table public.shop_links enable row level security;
alter table public.home_page enable row level security;
alter table public.products_page enable row level security;
alter table public.careers_page enable row level security;
alter table public.careers_gallery_images enable row level security;
alter table public.careers_why_join_cards enable row level security;
alter table public.about_page enable row level security;
alter table public.about_story_cards enable row level security;
alter table public.events_awards_page enable row level security;
alter table public.news_page enable row level security;
alter table public.events_page enable row level security;
alter table public.awards_page enable row level security;
alter table public.departments enable row level security;
alter table public.jobs enable row level security;
alter table public.news_items enable row level security;
alter table public.events enable row level security;
alter table public.awards enable row level security;
alter table public.project_features enable row level security;
alter table public.brands enable row level security;
alter table public.brand_tags enable row level security;
alter table public.product_categories enable row level security;
alter table public.category_sections enable row level security;
alter table public.section_paragraphs enable row level security;
alter table public.product_items enable row level security;
alter table public.product_item_highlights enable row level security;
alter table public.product_item_gallery enable row level security;
alter table public.product_item_sizes enable row level security;
alter table public.product_item_tags enable row level security;
alter table public.product_item_search_keywords enable row level security;
alter table public.media_assets enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_tags enable row level security;
alter table public.chat_uploads enable row level security;

-- Public visitors may submit contact messages, but only authenticated admins should read them.
drop policy if exists "contact_messages_public_insert" on public.contact_messages;
create policy "contact_messages_public_insert"
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "contact_messages_admin_read" on public.contact_messages;
create policy "contact_messages_admin_read"
on public.contact_messages
for select
to authenticated
using (auth.role() = 'authenticated');

drop policy if exists "media_assets_admin_read" on public.media_assets;
create policy "media_assets_admin_read"
on public.media_assets
for select
to authenticated
using (true);

-- Generic read policies:
-- - Public can read "settings-like" tables and published content
-- - Authenticated can read everything and manage content (for Supabase-auth-based admin later)

-- Settings tables readable publicly.
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "navigation_links_public_read" on public.navigation_links;
create policy "navigation_links_public_read" on public.navigation_links for select to anon, authenticated using (true);
drop policy if exists "contact_settings_public_read" on public.contact_settings;
create policy "contact_settings_public_read" on public.contact_settings for select to anon, authenticated using (true);
drop policy if exists "site_content_documents_public_read" on public.site_content_documents;
create policy "site_content_documents_public_read" on public.site_content_documents for select to anon, authenticated using (true);
drop policy if exists "social_links_public_read" on public.social_links;
create policy "social_links_public_read" on public.social_links for select to anon, authenticated using (true);
drop policy if exists "shop_links_public_read" on public.shop_links;
create policy "shop_links_public_read" on public.shop_links for select to anon, authenticated using (true);
drop policy if exists "home_page_public_read" on public.home_page;
create policy "home_page_public_read" on public.home_page for select to anon, authenticated using (true);
drop policy if exists "products_page_public_read" on public.products_page;
create policy "products_page_public_read" on public.products_page for select to anon, authenticated using (true);
drop policy if exists "careers_page_public_read" on public.careers_page;
create policy "careers_page_public_read" on public.careers_page for select to anon, authenticated using (true);
drop policy if exists "about_page_public_read" on public.about_page;
create policy "about_page_public_read" on public.about_page for select to anon, authenticated using (true);
drop policy if exists "events_awards_page_public_read" on public.events_awards_page;
create policy "events_awards_page_public_read" on public.events_awards_page for select to anon, authenticated using (true);
drop policy if exists "news_page_public_read" on public.news_page;
create policy "news_page_public_read" on public.news_page for select to anon, authenticated using (true);
drop policy if exists "events_page_public_read" on public.events_page;
create policy "events_page_public_read" on public.events_page for select to anon, authenticated using (true);
drop policy if exists "awards_page_public_read" on public.awards_page;
create policy "awards_page_public_read" on public.awards_page for select to anon, authenticated using (true);

-- Published-only public reads for content tables.
drop policy if exists "departments_public_read" on public.departments;
create policy "departments_public_read" on public.departments for select to anon, authenticated using (published = true);
drop policy if exists "jobs_public_read" on public.jobs;
create policy "jobs_public_read" on public.jobs for select to anon, authenticated using (published = true);
drop policy if exists "news_items_public_read" on public.news_items;
create policy "news_items_public_read" on public.news_items for select to anon, authenticated using (published = true);
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select to anon, authenticated using (published = true);
drop policy if exists "awards_public_read" on public.awards;
create policy "awards_public_read" on public.awards for select to anon, authenticated using (published = true);
drop policy if exists "project_features_public_read" on public.project_features;
create policy "project_features_public_read" on public.project_features for select to anon, authenticated using (published = true);
drop policy if exists "brands_public_read" on public.brands;
create policy "brands_public_read" on public.brands for select to anon, authenticated using (published = true);
drop policy if exists "product_categories_public_read" on public.product_categories;
create policy "product_categories_public_read" on public.product_categories for select to anon, authenticated using (true);
drop policy if exists "category_sections_public_read" on public.category_sections;
create policy "category_sections_public_read" on public.category_sections for select to anon, authenticated using (published = true);
drop policy if exists "product_items_public_read" on public.product_items;
create policy "product_items_public_read" on public.product_items for select to anon, authenticated using (published = true);

-- Authenticated full access (future: gate via Supabase Auth + roles/RLS).
-- Service role bypasses RLS, so the Next.js admin (which uses the service
-- role key) keeps full write access regardless of these policies.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'site_settings','navigation_links','contact_settings','site_content_documents','social_links','shop_links',
    'home_page','products_page','careers_page','careers_gallery_images','careers_why_join_cards',
    'about_page','about_story_cards','events_awards_page','news_page','events_page','awards_page',
    'departments','jobs','news_items','events','awards','promotions','project_features','brands','brand_tags',
    'product_categories','category_sections','section_paragraphs',
    'product_items','product_item_highlights','product_item_gallery','product_item_sizes','product_item_tags','product_item_search_keywords',
    'media_assets','chat_uploads'
  ]
  loop
    execute format('drop policy if exists "%1$s_authenticated_manage" on public.%1$s;', tbl);
    execute format('create policy "%1$s_authenticated_manage" on public.%1$s for all to authenticated using (true) with check (true);', tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Architecture additions (see docs/migration.md)
-- The promotions / promotion_tags / chat_uploads tables and their RLS are
-- declared earlier (next to media_assets) so the manage-policies loop above
-- can attach `*_authenticated_manage` policies to them in a single pass.
-- This block adds only what depends on those tables already existing:
-- the updated_at trigger, the public-read policies, and the storage_mode
-- CHECK constraint.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_promotions_updated_at') then
    create trigger trg_promotions_updated_at before update on public.promotions for each row execute function public.set_updated_at();
  end if;
end $$;

drop policy if exists "promotions_public_read" on public.promotions;
create policy "promotions_public_read" on public.promotions for select to anon, authenticated using (published = true);

drop policy if exists "promotion_tags_public_read" on public.promotion_tags;
create policy "promotion_tags_public_read" on public.promotion_tags for select to anon, authenticated using (true);

-- chat_uploads is admin-only by design: visitors do not need to read the log
-- of their own uploads, and exposing it would leak other visitors' URLs.
drop policy if exists "chat_uploads_admin_read" on public.chat_uploads;
create policy "chat_uploads_admin_read"
on public.chat_uploads for select to authenticated using (auth.role() = 'authenticated');

-- Constrain storage_mode to known values so a typo can never put the column
-- into a state the application cannot route. Done as a separate ALTER (not in
-- the CREATE TABLE) so deployments that already have the table are upgraded
-- in place without a destructive rebuild.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'media_assets_storage_mode_check'
  ) then
    alter table public.media_assets
      add constraint media_assets_storage_mode_check
      check (storage_mode in ('s3', 'supabase', 'local'));
  end if;
end $$;
