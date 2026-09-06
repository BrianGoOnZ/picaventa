export async function solicitarJson<T>(url: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, opciones)
  return (await respuesta.json()) as T
}

export function opcionesJson(metodo: string, cuerpo: unknown, token?: string): RequestInit {
  return {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(cuerpo)
  }
}
