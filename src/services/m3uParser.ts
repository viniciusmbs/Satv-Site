export const normalizeCategory = (rawGroup: string, name: string): string => {
  const upperName = name.toUpperCase();
  const upperGroup = (rawGroup || '').toUpperCase();

  // 1. Coloque a checagem de NOTÍCIAS primeiro para pegar GloboNews, Record News, BandNews, etc.
  if (
    upperGroup.includes('NOTÍCIA') ||
    upperGroup.includes('NOTICIA') ||
    upperGroup.includes('NEWS') ||
    upperName.includes('NEWS') ||
    upperName.includes('CNN') ||
    upperName.includes('GLOBONEWS') ||
    upperName.includes('GLOBO NEWS') ||
    upperName.includes('UOL')
  ) {
    return 'NOTÍCIAS';
  }

  // 2. Depois entram as outras categorias (Esportes, Filmes, etc.)
  if (upperGroup.includes('ESPORTE') || upperGroup.includes('PPV')) {
    if (upperName.includes('ESPN')) return 'ESPN';
    if (upperName.includes('PREMIERE')) return 'PREMIERE';
    return 'ESPORTES PPV';
  }
  if (upperGroup.includes('FILME') || upperGroup.includes('SÉRIE') || upperGroup.includes('SERIE')) {
    if (upperName.includes('HBO')) return 'HBO';
    return 'FILMES E SÉRIES';
  }
  if (upperGroup.includes('DOCUMENTÁRIO') || upperGroup.includes('DOCUMENTARIOS')) {
    return 'DOCUMENTÁRIOS';
  }
  if (upperGroup.includes('INFANTIL')) {
    return 'INFANTIS';
  }
  if (upperGroup.includes('RELIGIOSO')) {
    return 'RELIGIOSOS';
  }
  if (upperGroup.includes('VARIEDADE') || upperGroup.includes('MÚSICA') || upperGroup.includes('MUSICA')) {
    return 'VARIEDADES';
  }

  // 3. E por último a checagem geral de canais abertos (Globo, SBT, Record pura, etc.)
  if (
    upperGroup.includes('ABERTA') ||
    upperGroup.includes('REGIONAIS') ||
    upperName.includes('GLOBO') ||
    upperName.includes('SBT') ||
    upperName.includes('BAND') ||
    upperName.includes('RECORD')
  ) {
    return 'CANAL';
  }

  return rawGroup.replace(/^CANAIS:\s*/i, '').trim() || 'CANAL';
};
