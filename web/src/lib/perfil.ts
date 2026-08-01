export function primerNombre(nombre: string | null | undefined): string {
  return nombre?.split(' ')[0] || 'Sin nombre';
}
