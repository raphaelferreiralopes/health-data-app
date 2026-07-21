-- Maps BioMarker-Map organs (src/app/components/BodyOrganMap.tsx) to the lab
-- subcategories relevant to them. organ_key is a loose reference to the
-- organ ids used in the frontend, not a foreign key -- the organ list is a
-- small static enum with no admin UI, so it isn't modeled as its own table.

create table if not exists organ_lab_subcategories (
  organ_key text not null,
  subcategory_id uuid not null references lab_subcategories(id) on delete cascade,
  primary key (organ_key, subcategory_id)
);

create index if not exists idx_organ_lab_subcategories_subcategory
  on organ_lab_subcategories(subcategory_id);

-- Reference data: same public-read, no-write-via-API policy as the other
-- catalog tables (see 0002_rls_policies.sql).
alter table organ_lab_subcategories enable row level security;

create policy "organ_lab_subcategories: public read"
  on organ_lab_subcategories for select
  using (true);
