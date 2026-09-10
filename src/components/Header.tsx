import React from 'react';
import { PlaySquare, Star, ExternalLink, Maximize2, Tv, Palette } from 'lucide-react';
import { ProxyMode, ClickAction } from '../types';

interface HeaderProps {
  totalChannels: number;
  favoritesCount: number;
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (val: boolean) => void;
  onOpenTester: () => void;
  onOpenIconManager: () => void;
  customLogosCount: number;
  proxyMode: ProxyMode;
  setProxyMode: (mode: ProxyMode) => void;
  clickAction: ClickAction;
  setClickAction: (action: ClickAction) => void;
}

const Header: React.FC<HeaderProps> = ({
  totalChannels,
  favoritesCount,
  showOnlyFavorites,
  setShowOnlyFavorites,
  onOpenTester,
  onOpenIconManager,
  customLogosCount,
  proxyMode,
  setProxyMode,
  clickAction,
  setClickAction,
}) => {
  return (
    <header className="bg-gradient-to-r from-[#7f1d1d] via-[#991b1b] to-[#7f1d1d] text-white shadow-xl sticky top-0 z-40 border-b border-red-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setShowOnlyFavorites(false)}
          >
            <div className="relative flex items-center justify-center">
              <img
                src="https://i.imgur.com/VWtF2t5.jpeg"
                alt="SATV Logo"
                className="w-10 h-10 rounded-full border-2 border-white/80 shadow-md object-cover bg-black"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="sr-only">SATV</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-[#991b1b] text-xs font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                  SATV
                </span>
                <h1 className="text-base sm:text-lg font-bold tracking-wide text-white drop-shadow-sm truncate">
                  SATV - Vinicius Mendes ®
                </h1>
              </div>
              <p className="text-[11px] text-red-200/90 hidden sm:block">
                Web IPTV Player &bull; {totalChannels} Canais Prontos
              </p>
            </div>
          </div>

          {/* Quick Actions & Click Behavior Selector */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Click Mode Preference Selector */}
            <div className="hidden lg:flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <span className="px-2 text-[11px] font-semibold text-red-200 shrink-0">
                Ao clicar:
              </span>
              <button
                onClick={() => setClickAction('fullscreen')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition font-medium ${
                  clickAction === 'fullscreen'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Abre o canal em tela cheia com botão de Voltar e controle remoto"
              >
                <Tv className="w-3 h-3" />
                <span>Tela Cheia (com Voltar)</span>
              </button>

              <button
                onClick={() => setClickAction('popup')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition font-medium ${
                  clickAction === 'popup'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Abre o canal em uma janela pop-up compacta do navegador"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Pop-up</span>
              </button>

              <button
                onClick={() => setClickAction('new_tab')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition font-medium ${
                  clickAction === 'new_tab'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Abre a página do canal em uma nova aba do navegador"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Nova Aba</span>
              </button>
            </div>

            {/* Mobile / Tablet Click Mode Dropdown */}
            <div className="lg:hidden flex items-center">
              <select
                id="click-action-select"
                value={clickAction}
                onChange={(e) => setClickAction(e.target.value as ClickAction)}
                className="bg-black/40 text-red-100 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-red-300 cursor-pointer"
                title="Ação ao clicar no canal"
              >
                <option value="fullscreen">Ação: Tela Cheia (com Voltar)</option>
                <option value="popup">Ação: Pop-up</option>
                <option value="new_tab">Ação: Nova Aba</option>
              </select>
            </div>

            {/* Favorites Toggle Button */}
            <button
              id="header-favorites-btn"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showOnlyFavorites
                  ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-500/20'
                  : 'bg-black/30 text-white/90 hover:bg-black/40 border border-white/10'
              }`}
              title="Filtrar canais favoritos"
            >
              <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-slate-900' : 'text-amber-300'}`} />
              <span className="hidden xs:inline">Favoritos</span>
              <span className="bg-black/40 px-1.5 py-0.2 rounded-full text-[10px] text-white">
                {favoritesCount}
              </span>
            </button>

            {/* Icon Manager Button */}
            <button
              id="header-icons-btn"
              onClick={onOpenIconManager}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/30 hover:bg-black/50 text-white/90 border border-white/10 transition"
              title="Gerenciar e alterar ícones e logos dos canais"
            >
              <Palette className="w-3.5 h-3.5 text-amber-300" />
              <span>Ícones</span>
              {customLogosCount > 0 && (
                <span className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
                  {customLogosCount}
                </span>
              )}
            </button>

            {/* Test Stream / Custom M3U */}
            <button
              id="header-tester-btn"
              onClick={onOpenTester}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-black/30 hover:bg-black/50 text-white/90 border border-white/10 transition"
              title="Testar streams ou carregar M3U customizado"
            >
              <PlaySquare className="w-3.5 h-3.5 text-red-300" />
              <span className="hidden sm:inline">M3U</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
