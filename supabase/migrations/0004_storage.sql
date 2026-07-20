-- Asadarg: bucket de fotos + RLS de Storage (T012)
-- Contrato completo en specs/001-asadarg-mvp/contracts/storage.md
-- Convención de path: {evento_id}/{uuid}.{ext} — el primer folder = evento_id.

insert into storage.buckets (id, name, public)
values ('fotos-eventos', 'fotos-eventos', false)
on conflict (id) do nothing;

create policy fotos_eventos_select on storage.objects for select
  to authenticated using (
    bucket_id = 'fotos-eventos'
    and is_participant((storage.foldername(name))[1]::uuid)
  );

create policy fotos_eventos_insert on storage.objects for insert
  to authenticated with check (
    bucket_id = 'fotos-eventos'
    and is_participant((storage.foldername(name))[1]::uuid)
  );
