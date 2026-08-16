import { NextRequest, NextResponse } from "next/server";

type IbgeMunicipio = {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: { sigla?: string };
    };
  };
};

export type CitySuggestion = {
  id: number;
  name: string;
  uf: string;
  label: string;
};

let cache: CitySuggestion[] | null = null;
let cacheAt = 0;
const CACHE_MS = 24 * 60 * 60 * 1000;

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

async function loadCities(): Promise<CitySuggestion[]> {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;

  const response = await fetch(
    "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome",
    { next: { revalidate: 86400 } },
  );

  if (!response.ok) {
    throw new Error("Não foi possível consultar o IBGE.");
  }

  const data = (await response.json()) as IbgeMunicipio[];
  cache = data.map((city) => {
    const uf = city.microrregiao?.mesorregiao?.UF?.sigla ?? "";
    return {
      id: city.id,
      name: city.nome,
      uf,
      label: uf ? `${city.nome}, ${uf}` : city.nome,
    };
  });
  cacheAt = Date.now();
  return cache;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ cities: [] as CitySuggestion[] });
  }

  try {
    const cities = await loadCities();
    const needle = fold(query);
    const matches = cities
      .filter((city) => fold(city.label).includes(needle))
      .sort((a, b) => {
        const aName = fold(a.name);
        const bName = fold(b.name);
        const aStarts = aName.startsWith(needle) ? 0 : 1;
        const bStarts = bName.startsWith(needle) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.label.localeCompare(b.label, "pt-BR");
      })
      .slice(0, 12);

    return NextResponse.json({ cities: matches });
  } catch {
    return NextResponse.json(
      { cities: [], error: "Falha ao buscar cidades." },
      { status: 502 },
    );
  }
}
