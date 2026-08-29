-- The fields a company can register in, and the Rotabo category each lands
-- in. The list lives in domains.js, which is where it is edited and where the
-- business-side search reads it; this is the same pairs, in the database.
--
-- Why here as well: create-company has to turn a domain into a category, and
-- it carried the pairs as a hard-coded map. That meant every time the list
-- grew -- 113 to 163 to 213 in two days -- the whole function had to be
-- redeployed to add a lookup table, which is a lot of ceremony for a row of
-- data and one more place for the two lists to drift apart.
--
-- Read-only to everyone; only the service role writes. Adding a field is now
-- an insert here and a line in domains.js.

create table if not exists public.domain_categories (
  slug     text primary key,
  category text not null,
  constraint domain_categories_category_check
    check (category in ('drive','translator','move','build','tools','home',
                        'auto','care','learn','stay','pets','other'))
);

alter table public.domain_categories enable row level security;

drop policy if exists "no direct api access" on public.domain_categories;
create policy "no direct api access" on public.domain_categories
  for all to anon, authenticated using (false) with check (false);

insert into public.domain_categories (slug, category) values
  ('taxi','drive'),
  ('ride_hailing','drive'),
  ('chauffeur','drive'),
  ('driving_school','drive'),
  ('translation','translator'),
  ('interpreting','translator'),
  ('sworn_translation','translator'),
  ('language_school','translator'),
  ('removals','move'),
  ('international_removals','move'),
  ('courier','move'),
  ('freight_forwarding','move'),
  ('refrigerated_transport','move'),
  ('haulage','move'),
  ('storage_warehousing','move'),
  ('customs_brokerage','move'),
  ('excavation','build'),
  ('crane_hire','build'),
  ('scaffolding','build'),
  ('demolition','build'),
  ('concrete_works','build'),
  ('surveying','build'),
  ('tool_hire','tools'),
  ('machinery_rental','tools'),
  ('generator_hire','tools'),
  ('electrical_installation','home'),
  ('plumbing','home'),
  ('heating_hvac','home'),
  ('air_conditioning','home'),
  ('painting_decorating','home'),
  ('carpentry','home'),
  ('flooring','home'),
  ('roofing','home'),
  ('locksmith','home'),
  ('cleaning_services','home'),
  ('gardening_landscaping','home'),
  ('renovation','home'),
  ('car_repair','auto'),
  ('mobile_mechanic','auto'),
  ('tyre_service','auto'),
  ('bodywork_paint','auto'),
  ('towing_recovery','auto'),
  ('childcare','care'),
  ('elderly_care','care'),
  ('home_nursing','care'),
  ('private_tutoring','learn'),
  ('music_lessons','learn'),
  ('sports_coaching','learn'),
  ('it_training','learn'),
  ('vocational_training','learn'),
  ('holiday_lettings','stay'),
  ('guesthouse_bnb','stay'),
  ('property_management','stay'),
  ('veterinary','pets'),
  ('dog_walking','pets'),
  ('pet_grooming','pets'),
  ('general_practice','other'),
  ('dentistry','other'),
  ('physiotherapy','other'),
  ('psychology','other'),
  ('pharmacy','other'),
  ('optometry','other'),
  ('medical_laboratory','other'),
  ('software_development','other'),
  ('web_development','other'),
  ('it_support','other'),
  ('cybersecurity','other'),
  ('data_ai','other'),
  ('cloud_hosting','other'),
  ('accounting','other'),
  ('audit_tax','other'),
  ('legal_services','other'),
  ('hr_recruitment','other'),
  ('management_consulting','other'),
  ('insurance_brokerage','other'),
  ('real_estate_agency','other'),
  ('architecture','other'),
  ('manufacturing','other'),
  ('cnc_machining','other'),
  ('metalwork_welding','other'),
  ('restaurant','other'),
  ('catering','other'),
  ('hotel','other'),
  ('event_management','other'),
  ('agriculture','other'),
  ('forestry','other'),
  ('waste_recycling','other'),
  ('renewable_energy','other'),
  ('marketing_agency','other'),
  ('graphic_design','other'),
  ('photography','other'),
  ('video_production','other'),
  ('printing_signage','other'),
  ('wholesale','other'),
  ('ecommerce','other'),
  ('security_services','other'),
  ('shop_general','other'),
  ('shop_bicycle','other'),
  ('shop_auto_parts','auto'),
  ('shop_hardware','tools'),
  ('shop_furniture','home'),
  ('shop_electronics','other'),
  ('shop_clothing','other'),
  ('shop_grocery','other'),
  ('shop_sports','other'),
  ('shop_books','other'),
  ('shop_florist','other'),
  ('shop_pet','pets'),
  ('motorcycle_repair','auto'),
  ('hairdressing','other'),
  ('beauty_salon','other'),
  ('massage_therapy','other'),
  ('fitness_training','other'),
  ('bar','other'),
  ('kebab_shawarma','other'),
  ('pizzeria','other'),
  ('fast_food','other'),
  ('bakery','other'),
  ('pastry_shop','other'),
  ('coffee_shop','other'),
  ('food_truck','other'),
  ('butcher','other'),
  ('ice_cream','other'),
  ('winery','other'),
  ('brewery','other'),
  ('nightclub','other'),
  ('beach_club','stay'),
  ('bowling_billiards','other'),
  ('travel_agency','stay'),
  ('nail_salon','other'),
  ('barber','other'),
  ('tattoo_piercing','other'),
  ('spa_sauna','other'),
  ('cosmetics_shop','other'),
  ('dry_cleaning','other'),
  ('podiatry','other'),
  ('dental_laboratory','other'),
  ('orthodontics','other'),
  ('dermatology','other'),
  ('paediatrics','other'),
  ('gynaecology','other'),
  ('cardiology','other'),
  ('medical_imaging','other'),
  ('speech_therapy','care'),
  ('nutrition_dietetics','other'),
  ('bicycle_repair','other'),
  ('scooter_repair','auto'),
  ('appliance_repair','home'),
  ('phone_repair','other'),
  ('computer_repair','other'),
  ('watch_jewellery_repair','other'),
  ('shoe_repair','other'),
  ('tailoring_alterations','other'),
  ('upholstery','home'),
  ('glazing','build'),
  ('chimney_sweep','home'),
  ('pest_control','home'),
  ('pool_maintenance','home'),
  ('window_cleaning','home'),
  ('car_wash','auto'),
  ('car_rental','drive'),
  ('bike_scooter_rental','drive'),
  ('funeral_services','other'),
  ('notary','other'),
  ('bailiff','other'),
  ('patent_trademark','other'),
  ('debt_collection','other'),
  ('company_formation','other'),
  ('financial_advisory','other'),
  ('payroll_services','other'),
  ('currency_exchange','other'),
  ('pawnshop','other'),
  ('leasing','other'),
  ('hearing_aids','other'),
  ('medical_transport','care'),
  ('rehabilitation','care'),
  ('occupational_therapy','care'),
  ('midwifery','care'),
  ('acupuncture','other'),
  ('chiropractic','other'),
  ('insulation','build'),
  ('waterproofing','build'),
  ('plastering','build'),
  ('tiling','build'),
  ('drywall','build'),
  ('fencing','build'),
  ('paving','build'),
  ('well_drilling','build'),
  ('septic_systems','build'),
  ('solar_panels','home'),
  ('alarm_cctv','home'),
  ('smart_home','home'),
  ('lift_maintenance','build'),
  ('fire_safety','build'),
  ('car_dealer','auto'),
  ('vehicle_inspection','auto'),
  ('auto_electrics','auto'),
  ('car_glass','auto'),
  ('boat_repair','auto'),
  ('bus_charter','drive'),
  ('call_centre','other'),
  ('virtual_assistant','other'),
  ('market_research','other'),
  ('copywriting','other'),
  ('seo_services','other'),
  ('social_media','other'),
  ('app_development','other'),
  ('game_development','other'),
  ('drone_services','other'),
  ('printing_3d','other'),
  ('interior_design','home'),
  ('dance_school','learn'),
  ('art_gallery','other')
on conflict (slug) do update set category = excluded.category;

-- Applied 2026-08-29: company logos.
--
-- A company uploads a picture to our own storage rather than linking one from
-- its site. Linking would have been a line of code and a request to somebody
-- else's server on every page view -- slow when their host is, broken when
-- they move the file, and a way for them to see who is looking.
--
-- logo_path is where the file sits; logo_approved decides whether anyone but
-- the admin ever sees it, and is false on arrival. A stranger can put a
-- picture on this site and nothing they put there appears until it has been
-- looked at, in the Companies tab of the dashboard.

alter table public.companies
  add column if not exists logo_path text,
  add column if not exists logo_approved boolean not null default false;

-- Public for reading, because an approved logo is meant to be seen and a
-- signed URL that expires is the wrong shape for a static page. Nobody writes
-- to it over the API: uploads go through create-company on the service role.
-- The path is the company's uuid plus a random name, so an unapproved file is
-- not reachable by guessing -- which is not the same as private and is not
-- pretended to be. Rejecting a logo deletes the object.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', true, 524288,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company logos are readable" on storage.objects;
create policy "company logos are readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'company-logos');

-- The public list carries the logo only once approved: an unapproved one
-- comes back null rather than with a flag, so there is nothing for a page to
-- render by mistake.
drop function if exists public.companies_public();

create function public.companies_public()
returns table (
  id uuid, name text, domain text, category text, role text,
  country text, city text, website_url text, logo_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id, c.name, c.domain, c.category, c.role,
         c.country, c.city, c.website_url,
         case when c.logo_approved then c.logo_path else null end,
         c.created_at
  from public.companies c
  where c.visible_until is not null and c.visible_until > now()
  order by c.created_at;
$$;

grant execute on function public.companies_public() to anon, authenticated;
