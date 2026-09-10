import React, { useState } from 'react';
import { Play, Star, Copy, Check, ExternalLink, Maximize2, Tv, Palette } from 'lucide-react';
import { Channel, ClickAction } from '../types';
import { getChannelLogo } from '../data/channelLogos';

interface ChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  clickAction: ClickAction;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channelName: string) => void;
  onCopyUrl: (url: string, name: string) => void;
  onEditLogo?: (channel: Channel) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isFavorite,
  clickAction,
  onSelect,
  onToggleFavorite,
  onCopyUrl,
  onEditLogo,
}) => {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use channelLogos fallback instead of ui-avatars
  const fallbackLogo = getChannelLogo(channel.name);
  const logoSrc = imgError || !channel.logo ? fallbackLogo : channel.logo;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCopyUrl(channel.url, channel.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(channel.name);
  };

  const handleEditLogo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditLogo) {
      onEditLogo(channel);
    }
  };

  const handleOpenPopup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const width = 1040;
    const height = 620;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
    window.open(
      channel.url,
      `satv_${encodeURIComponent(channel.name.replace(/\s+/g, '_'))}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,status=no,toolbar=no,menubar=no`
    );
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(channel);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (clickAction === 'new_tab') {
      // Allow the default <a> navigation to target="_blank"
      return;
    }
    e.preventDefault();
    if (clickAction === 'popup') {
      handleOpenPopup(e);
    } else {
      onSelect(channel);
    }
  };

  return (
    <div
      id={`channel-card-${channel.id || encodeURIComponent(channel.name)}`}
      className="group relative bg-[#151c2c] hover:bg-[#1a2337] border border-slate-700/60 hover:border-red-500/60 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-950/40"
    >
      {/* Top action bar: Favorite, Pop-up & Copy */}
      <div className="w-full flex items-center justify-between gap-1 mb-2 z-10">
        <button
          onClick={handleFavorite}
          className={`p-1 rounded-md transition-colors ${
            isFavorite
              ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
          }`}
          title={isFavorite ? 'Remover dos favoritos' : 'Favoritar canal'}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
        </button>

        <div className="flex items-center space-x-1">
          {/* Change channel logo button */}
          <button
            onClick={handleEditLogo}
            className="p-1 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800/80 transition"
            title="Mudar ícone deste canal"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {/* Direct Pop-up button */}
          <button
            onClick={handleOpenPopup}
            className="p-1 text-slate-400 hover:text-amber-300 rounded-md hover:bg-slate-800/80 transition"
            title="Abrir em Janela Pop-up do navegador"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Copy URL */}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/80 transition"
            title="Copiar link direto do canal"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Link Wrapper: Allows direct opening or configured click */}
      <a
        href={channel.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleCardClick}
        className="w-full flex flex-col items-center cursor-pointer text-decoration-none outline-none"
        title={`Assistir ${channel.name} (${clickAction === 'new_tab' ? 'Abrir em Nova Aba' : clickAction === 'popup' ? 'Abrir em Pop-up' : 'Abrir no Player'})`}
      >
        {/* Logo container */}
        <div className="relative w-full h-16 sm:h-20 flex items-center justify-center p-2 bg-slate-900/80 rounded-lg overflow-hidden mb-2 group-hover:bg-slate-900/50 border border-slate-800/60 transition">
          <img
            src={logoSrc}
            alt={`${channel.name} logo`}
            className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-red-600 text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span className="text-[11px] font-bold">
                {clickAction === 'new_tab' ? 'Nova Aba' : clickAction === 'popup' ? 'Pop-up' : 'Player'}
              </span>
            </div>
          </div>
        </div>

        {/* Channel Name */}
        <p
          className="text-gray-100 text-xs font-bold line-clamp-2 w-full leading-snug group-hover:text-red-400 transition-colors"
          title={channel.name}
        >
          {channel.name}
        </p>
      </a>

      {/* Category Tag */}
      <span className="text-[10px] text-slate-400 mt-1 truncate max-w-full font-medium">
        {channel.group}
      </span>

      {/* Quick Launch footer buttons on each card */}
      <div className="w-full mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between gap-1 text-[10px]">
        {/* Native New Tab link button */}
        <a
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1 px-1.5 rounded bg-slate-800/70 hover:bg-red-600/30 hover:text-red-300 text-slate-300 flex items-center justify-center space-x-1 transition font-medium"
          title="Abrir diretamente em nova aba do navegador"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Aba</span>
        </a>

        {/* Player modal button */}
        <button
          onClick={handleOpenModal}
          className="flex-1 py-1 px-1.5 rounded bg-slate-800/70 hover:bg-slate-700 hover:text-white text-slate-300 flex items-center justify-center space-x-1 transition font-medium"
          title="Abrir no player incorporado do app"
        >
          <Tv className="w-2.5 h-2.5 text-red-400" />
          <span>Player</span>
        </button>
      </div>
    </div>
  );
};

export default ChannelCard;
