# Contrato: Supabase Storage (fotos de evento)

## Bucket

`fotos-eventos` (privado — acceso solo vía URL firmada o RLS de Storage, no público).

## Convención de path

```text
{evento_id}/{uuid}.{ext}
```

## Contrato de subida (cliente)

1. La imagen se comprime client-side con `browser-image-compression`
   (`maxSizeMB: 0.2`, ver `research.md` §3) **antes** de llamar a
   `supabase.storage.from('fotos-eventos').upload(...)`.
2. Tras el upload exitoso, el cliente inserta una fila en `foto_evento` con el
   `storage_path` resultante (ver `data-model.md`).
3. Formatos aceptados: `jpg`, `jpeg`, `png`, `webp`. Cualquier otro formato se
   rechaza en el cliente antes de intentar subir.

## Permisos (RLS de Storage)

- Solo participantes del evento (`evento_participante`) pueden subir o ver fotos de
  `{evento_id}/...`.
- No hay borrado de fotos en v1 (fuera de scope — no se especificó en la spec).
