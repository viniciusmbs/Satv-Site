import { Channel, CustomLogosMap } from '../types';
import { getChannelLogo } from '../data/channelLogos';

export const normalizeCategory = (rawGroup: string, name: string): string => {
  const upperName = name.toUpperCase();
  const upperGroup = (rawGroup || '').toUpperCase();

  // Mapeamento direto baseado nos seus group-titles do M3U:
  if (upperGroup.includes('ABERTA') || upperGroup.includes('REGIONAIS') || upperName.includes('GLOBO') || upperName.includes('SBT') || upperName.includes('BAND') || upperName.includes('RECORD')) {
    return 'CANAL';
  }
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
  if (upperGroup.includes('NOTÍCIA') || upperGroup.includes('NOTICIA') || upperGroup.includes('NEWS')) {
    return 'NOTÍCIAS';
  }
  if (upperGroup.includes('RELIGIOSO')) {
    return 'RELIGIOSOS';
  }
  if (upperGroup.includes('VARIEDADE') || upperGroup.includes('MÚSICA') || upperGroup.includes('MUSICA')) {
    return 'VARIEDADES';
  }

  return rawGroup.replace(/^CANAIS:\s*/i, '').trim() || 'CANAL';
};

export const toHttpsIfPossible = (u?: string): string => {
  if (!u) return '';
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('http://')) {
    const httpsHosts = [
      'blogspot.com',
      '1.bp.blogspot.com',
      '2.bp.blogspot.com',
      '3.bp.blogspot.com',
      '4.bp.blogspot.com',
      'googleusercontent.com',
      'lh3.googleusercontent.com',
      'postimg.cc',
      'i.postimg.cc',
      'ibb.co',
      'i.ibb.co',
      'wikimedia.org',
      'upload.wikimedia.org',
      'wikipedia.org',
      'ctcdn.com',
      'mitvstatic.com',
      'imgu.top',
      'clarotvmais.com.br',
      'mondrian.claro.com.br',
      'imgur.com',
      'i.imgur.com',
    ];
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (httpsHosts.some((h) => host.endsWith(h))) {
        return u.replace(/^http:\/\//i, 'https://');
      }
    } catch {
      // ignore URL parse errors
    }
  }
  return u;
};

export const parseM3U = (m3uContent: string, customLogos?: CustomLogosMap): Channel[] => {
  const channels: Channel[] = [];
  const lines = m3uContent.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      try {
        const infoLine = line;
        let urlLine = '';
        while (i + 1 < lines.length) {
          const next = lines[++i].trim();
          if (next && !next.startsWith('#')) {
            urlLine = next;
            break;
          }
        }

        if (!urlLine) {
          continue;
        }

        const idMatch = infoLine.match(/tvg-id="([^"]*)"/);
        const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
        const groupMatch = infoLine.match(/group-title="([^"]*)"/);
        const nameAttrMatch = infoLine.match(/tvg-name="([^"]*)"/);
        const commaNameMatch = infoLine.match(/,(.*)$/);

        const name = (commaNameMatch ? commaNameMatch[1].trim() : '') ||
          (nameAttrMatch ? nameAttrMatch[1].trim() : 'Canal Desconhecido');

        const rawGroup = groupMatch ? groupMatch[1].trim() : 'CANAL';
        const finalGroup = normalizeCategory(rawGroup, name);

        const rawLogo = logoMatch ? logoMatch[1].trim() : '';
        const secureLogo = (customLogos && (customLogos[name] || customLogos[name.toUpperCase()]))
          || toHttpsIfPossible(rawLogo)
          || getChannelLogo(name, customLogos);

        const channel: Channel = {
          id: (idMatch && idMatch[1]) ? idMatch[1] : `ch-${channels.length + 1}`,
          name: name,
          logo: secureLogo,
          group: finalGroup,
          url: urlLine,
          originalUrl: urlLine,
        };

        channels.push(channel);
      } catch (error) {
        console.error('Erro ao processar linha da playlist M3U:', line, error);
      }
    }
  }

  return channels;
};
