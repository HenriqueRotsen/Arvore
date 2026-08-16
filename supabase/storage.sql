-- Bucket público para fotos das pessoas (SQL Editor do Supabase, uma vez).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
