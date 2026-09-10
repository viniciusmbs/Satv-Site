import React, { useState, useEffect, useMemo } from 'react';
import type { Channel, GroupedChannels, ProxyMode, ClickAction, CustomLogosMap } from './types';
import { parseM3U } from './services/m3uParser';
import { m3uPlaylist } from './data/playlist';
import { getChannelLogo } from './data/channelLogos';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ChannelGrid from './components/ChannelGrid';
import { FullscreenViewer } from './components/FullscreenViewer';
import StreamTesterModal from './components/StreamTesterModal';
import { IconManagerModal } from './components/IconManagerModal';
import { Check } from 'lucide-react';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [proxyMode, setProxyMode] = useState<ProxyMode>('server');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isIconManagerOpen, setIsIconManagerOpen] = useState(false);
  const [editingChannelForLogo, setEditingChannelForLogo] = useState<Channel | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom logos stored in localStorage
  const [customLogos, setCustomLogos] = useState<CustomLogosMap>(() => {
    try {
      const saved = localStorage.getItem('satv_custom_logos');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Click behavior: 'fullscreen' | 'new_tab' | 'popup'
  // Defaults to 'fullscreen' (opens in full TV screen with dedicated back button)
  const [clickAction, setClickAction] = useState<ClickAction>(() => {
    try {
      const saved = localStorage.getItem('satv_click_action') as ClickAction;
      return saved === 'fullscreen' || saved === 'new_tab' || saved === 'popup' ? saved : 'fullscreen';
    } catch {
      return 'fullscreen';
    }
  });

  const handleSetClickAction = (action: ClickAction) => {
    setClickAction(action);
    try {
      localStorage.setItem('satv_click_action', action);
    } catch (e) {
      console.warn('Erro ao salvar click action no localStorage:', e);
    }
  };

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('satv_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Load initial playlist with customLogos applied
  useEffect(() => {
    try {
      const parsed = parseM3U(m3uPlaylist, customLogos);
      setChannels(parsed);
    } catch (err) {
      console.error('Falha ao carregar playlist inicial:', err);
    }
  }, []);

  // Save custom logo
  const handleSaveCustomLogo = (channelName: string, logoUrl: string) => {
    setCustomLogos((prev) => {
      const next = { ...prev, [channelName]: logoUrl };
      try {
        localStorage.setItem('satv_custom_logos', JSON.stringify(next));
      } catch (e) {
        console.error('Erro ao salvar custom logos:', e);
      }
      return next;
    });

    setChannels((prev) =>
      prev.map((ch) =>
        ch.name === channelName ? { ...ch, logo: logoUrl } : ch
      )
    );

    showToast(`Ícone do canal "${channelName}" atualizado com sucesso!`);
  };

  // Reset single channel logo to default
  const handleResetChannelLogo = (channelName: string) => {
    setCustomLogos((prev) => {
      const next = { ...prev };
      delete next[channelName];
      try {
        localStorage.setItem('satv_custom_logos', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    const defaultLogo = getChannelLogo(channelName);
    setChannels((prev) =>
      prev.map((ch) =>
        ch.name === channelName ? { ...ch, logo: defaultLogo } : ch
      )
    );

    showToast(`Ícone de "${channelName}" restaurado para o padrão oficial.`);
  };

  // Reset all logos to default
  const handleResetAllLogos = () => {
    setCustomLogos({});
    try {
      localStorage.removeItem('satv_custom_logos');
    } catch (e) {
      console.error(e);
    }
    const parsed = parseM3U(m3uPlaylist);
    setChannels(parsed);
    showToast('Todos os ícones foram restaurados aos padrões oficiais!');
  };

  const handleEditChannelLogo = (channel: Channel) => {
    setEditingChannelForLogo(channel);
    setIsIconManagerOpen(true);
  };

  // Save favorites to localStorage
  const toggleFavorite = (channelName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(channelName)) {
        next.delete(channelName);
      } else {
        next.add(channelName);
      }
      try {
        localStorage.setItem('satv_favorites', JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error('Erro ao salvar favoritos:', err);
      }
      return next;
    });
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  const handleCopyUrl = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    showToast(`URL do canal "${name}" copiada com sucesso!`);
  };

  // Extract unique sorted categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((ch) => {
      if (ch.group) set.add(ch.group);
    });
    return Array.from(set).sort();
  }, [channels]);

  // Filter channels according to search, category, and favorites
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return channels.filter((channel) => {
      // Favorites filter
      if (showOnlyFavorites && !favorites.has(channel.name)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'TODOS' && channel.group !== selectedCategory) {
        return false;
      }

      // Search query filter (matches channel name or group)
      if (q) {
        const nameMatch = channel.name.toLowerCase().includes(q);
        const groupMatch = channel.group.toLowerCase().includes(q);
        return nameMatch || groupMatch;
      }

      return true;
    });
  }, [channels, searchQuery, selectedCategory, showOnlyFavorites, favorites]);

  // Group filtered channels by group title
  const groupedChannels = useMemo(() => {
    const grouped: GroupedChannels = {};
    filteredChannels.forEach((ch) => {
      const g = ch.group || 'GERAL';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(ch);
    });
    return grouped;
  }, [filteredChannels]);

  // Handle previous / next channel navigation in video player
  const currentIndex = useMemo(() => {
    if (!selectedChannel) return -1;
    return filteredChannels.findIndex(
      (c) => c.name === selectedChannel.name && c.url === selectedChannel.url
    );
  }, [selectedChannel, filteredChannels]);

  const handlePrevChannel = () => {
    if (currentIndex > 0) {
      setSelectedChannel(filteredChannels[currentIndex - 1]);
    } else if (filteredChannels.length > 0) {
      setSelectedChannel(filteredChannels[filteredChannels.length - 1]);
    }
  };

  const handleNextChannel = () => {
    if (currentIndex >= 0 && currentIndex < filteredChannels.length - 1) {
      setSelectedChannel(filteredChannels[currentIndex + 1]);
    } else if (filteredChannels.length > 0) {
      setSelectedChannel(filteredChannels[0]);
    }
  };

  // Custom playlist handler
  const handleLoadCustomPlaylist = (customM3u: string) => {
    const parsed = parseM3U(customM3u, customLogos);
    if (parsed.length > 0) {
      setChannels(parsed);
      setSelectedCategory('TODOS');
      setSearchQuery('');
      showToast(`Playlist carregada: ${parsed.length} canais prontos!`);
    } else {
      showToast('Nenhum canal válido encontrado na playlist fornecida.');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('TODOS');
    setShowOnlyFavorites(false);
  };

  // Global D-Pad / Remote control shortcut: Press '/' or 's' to focus search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (!selectedChannel && (e.key === '/' || e.key === 's') && document.activeElement?.tagName !== 'INPUT') {
        const searchInput = document.getElementById('channel-search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [selectedChannel]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* App Header */}
      <Header
        totalChannels={channels.length}
        favoritesCount={favorites.size}
        showOnlyFavorites={showOnlyFavorites}
        setShowOnlyFavorites={setShowOnlyFavorites}
        onOpenTester={() => setIsTesterOpen(true)}
        onOpenIconManager={() => {
          setEditingChannelForLogo(null);
          setIsIconManagerOpen(true);
        }}
        customLogosCount={Object.keys(customLogos).length}
        proxyMode={proxyMode}
        setProxyMode={setProxyMode}
        clickAction={clickAction}
        setClickAction={handleSetClickAction}
      />

      {/* Search & Category Filter Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        filteredCount={filteredChannels.length}
      />

      {/* Main Channel Grid */}
      <main className="flex-1">
        <ChannelGrid
          groupedChannels={groupedChannels}
          clickAction={clickAction}
          onSelectChannel={setSelectedChannel}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onCopyUrl={handleCopyUrl}
          showOnlyFavorites={showOnlyFavorites}
          onClearFilters={handleClearFilters}
          onEditLogo={handleEditChannelLogo}
        />
      </main>

      {/* Fullscreen TV View with Back Button */}
      <FullscreenViewer
        channel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
        onPrevChannel={filteredChannels.length > 1 ? handlePrevChannel : undefined}
        onNextChannel={filteredChannels.length > 1 ? handleNextChannel : undefined}
      />

      {/* Stream Tester / M3U Modal */}
      <StreamTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onLoadCustomPlaylist={handleLoadCustomPlaylist}
      />

      {/* Icon Manager Modal */}
      <IconManagerModal
        isOpen={isIconManagerOpen}
        onClose={() => {
          setIsIconManagerOpen(false);
          setEditingChannelForLogo(null);
        }}
        channels={channels}
        customLogos={customLogos}
        onSaveCustomLogo={handleSaveCustomLogo}
        onResetChannelLogo={handleResetChannelLogo}
        onResetAllLogos={handleResetAllLogos}
        initialSelectedChannel={editingChannelForLogo}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e293b] border border-slate-700 text-white text-xs sm:text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 animate-in slide-in-from-bottom-2 fade-in">
          <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#090d16] border-t border-slate-900 py-6 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          SATV &bull; Vinicius Mendes ® &copy; {new Date().getFullYear()}
        </p>
        <p className="text-[11px] text-slate-600">
          Suporte completo para Smart TV &bull; D-Pad &bull; MPEG-TS &bull; HLS &bull; Web Embed
        </p>
      </footer>
    </div>
  );
}
