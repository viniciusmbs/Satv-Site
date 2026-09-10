import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  X,
  Maximize,
  Minimize,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Tv,
  Info,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Channel, ProxyMode } from '../types';

declare const window: any;

interface VideoPlayerProps {
  channel: Channel | null;
  onClose: () => void;
  proxyMode: ProxyMode;
  setProxyMode: (mode: ProxyMode) => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  onClose,
  proxyMode,
  setProxyMode,
  onPrevChannel,
  onNextChannel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mpegtsPlayerRef = useRef<any>(null);
  const hlsPlayerRef = useRef<any>(null);

  const [playerStatus, setPlayerStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Determine if stream is a web embed or direct video file
  const rawUrl = channel ? channel.originalUrl || channel.url : '';
  const isEmbedPage =
    Boolean(channel) &&
    !rawUrl.endsWith('.ts') &&
    !rawUrl.includes('.m3u8') &&
    !rawUrl.endsWith('.mp4');

  const embedIframeSrc = useMemo(() => {
    if (!channel?.url) return '';
    if (channel.url.toLowerCase().includes('embedtv')) {
      return `/api/embed-frame?url=${encodeURIComponent(channel.url)}`;
    }
    return channel.url;
  }, [channel?.url]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'ArrowLeft' && onPrevChannel) {
        onPrevChannel();
      } else if (e.key === 'ArrowRight' && onNextChannel) {
        onNextChannel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevChannel, onNextChannel]);

  // Clean up player instances
  const cleanupPlayers = useCallback(() => {
    if (mpegtsPlayerRef.current) {
      try {
        mpegtsPlayerRef.current.pause();
        mpegtsPlayerRef.current.unload();
        mpegtsPlayerRef.current.detachMediaElement();
        mpegtsPlayerRef.current.destroy();
      } catch (err) {
        console.error('Erro ao destruir mpegts:', err);
      }
      mpegtsPlayerRef.current = null;
    }

    if (hlsPlayerRef.current) {
      try {
        hlsPlayerRef.current.destroy();
      } catch (err) {
        console.error('Erro ao destruir HLS:', err);
      }
      hlsPlayerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, []);

  // Compute final stream URL according to selected proxy mode
  const getStreamUrl = useCallback(
    (url: string, mode: ProxyMode): string => {
      if (mode === 'server') {
        return `/api/stream?url=${encodeURIComponent(url)}`;
      }
      if (mode === 'corsproxy') {
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
      }
      return url;
    },
    []
  );

  // Initialize playback for raw streams (.ts / .m3u8)
  useEffect(() => {
    if (!channel) {
      cleanupPlayers();
      setPlayerStatus('idle');
      return;
    }

    // Embed pages are handled directly via iframe
    if (isEmbedPage) {
      cleanupPlayers();
      setPlayerStatus('playing');
      setErrorMessage(null);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    cleanupPlayers();
    setPlayerStatus('loading');
    setErrorMessage(null);

    const finalUrl = getStreamUrl(rawUrl, proxyMode);

    const mpegtsLib = window.mpegts || null;
    const HlsLib = window.Hls || null;

    const isDirectMpegTs = rawUrl.endsWith('.ts') || rawUrl.includes(':80');
    const isHlsStream = rawUrl.includes('.m3u8');

    let isHandled = false;

    // 1. MPEG-TS stream
    if (isDirectMpegTs && mpegtsLib && mpegtsLib.isSupported()) {
      try {
        const player = mpegtsLib.createPlayer(
          {
            type: 'mse',
            isLive: true,
            url: finalUrl,
            cors: true,
          },
          {
            enableWorker: true,
            lazyLoadMaxDuration: 3 * 60,
            seekType: 'range',
          }
        );

        mpegtsPlayerRef.current = player;
        player.attachMediaElement(videoElement);

        player.on(mpegtsLib.Events.ERROR, (errorType: any, errorDetail: any) => {
          console.error('MPEGTS error:', errorType, errorDetail);
          setPlayerStatus('error');
          setErrorMessage(
            `Falha na decodificação MPEG-TS (${errorType}). Clique em "Abrir em Nova Aba" ou "Pop-up" para assistir diretamente.`
          );
        });

        player.load();
        player.play().catch((err: any) => {
          console.warn('Autoplay bloqueado:', err);
        });

        isHandled = true;
      } catch (err: any) {
        console.error('Falha ao inicializar mpegts.js:', err);
      }
    }

    // 2. HLS stream
    if (!isHandled && isHlsStream && HlsLib && HlsLib.isSupported()) {
      try {
        const hls = new HlsLib({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsPlayerRef.current = hls;
        hls.loadSource(finalUrl);
        hls.attachMedia(videoElement);

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          videoElement.play().catch(() => {});
          setPlayerStatus('playing');
        });

        hls.on(HlsLib.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            setPlayerStatus('error');
            setErrorMessage(`Erro no stream HLS: ${data.details}. Tente abrir em nova aba.`);
          }
        });

        isHandled = true;
      } catch (err: any) {
        console.error('Falha ao inicializar HLS:', err);
      }
    }

    // 3. Native video fallback
    if (!isHandled) {
      videoElement.src = finalUrl;
      videoElement
        .play()
        .then(() => setPlayerStatus('playing'))
        .catch(() => setPlayerStatus('error'));
    }

    return () => {
      cleanupPlayers();
    };
  }, [channel, isEmbedPage, rawUrl, proxyMode, reloadKey, getStreamUrl, cleanupPlayers]);

  if (!channel) return null;

  const toggleFullscreen = () => {
    const container = document.getElementById('satv-player-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const copyChannelUrl = () => {
    navigator.clipboard.writeText(rawUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenNewTab = () => {
    window.open(rawUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenPopup = () => {
    const width = 1040;
    const height = 620;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
    window.open(
      rawUrl,
      `satv_${encodeURIComponent(channel.name.replace(/\s+/g, '_'))}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,status=no,toolbar=no,menubar=no`
    );
  };

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="satv-player-container"
        className="relative bg-[#0f172a] border border-slate-700/80 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="bg-[#1e293b] border-b border-slate-700/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center p-1 shrink-0">
              <img
                src={channel.logo}
                alt=""
                className="max-w-full max-h-full object-contain"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="text-white font-bold text-sm sm:text-base truncate">
                  {channel.name}
                </h3>
                <span className="text-[10px] bg-red-600/30 text-red-300 font-semibold px-2 py-0.5 rounded-full border border-red-500/40">
                  {channel.group}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isEmbedPage ? 'Stream Web Incorporado' : `Modo: ${proxyMode.toUpperCase()}`} &bull;{' '}
                <span className="text-emerald-400 font-medium">Ao Vivo</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition"
              title="Abrir página completa do canal em nova aba do navegador"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Aba</span>
            </a>

            <button
              onClick={handleOpenPopup}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 shadow-sm transition"
              title="Abrir em Janela Pop-up compacta e flutuante"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pop-up</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Helpful status bar for web embed streams */}
        {isEmbedPage && (
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-200">
                <strong>Player Interno Ativo:</strong> Desbloqueio anti-sandbox aplicado para reprodução interna.
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenPopup}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold rounded-md flex items-center space-x-1.5 transition text-[11px]"
                title="Abrir em janela externa compacta"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Pop-up</span>
              </button>
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-semibold rounded-md flex items-center space-x-1.5 transition text-[11px]"
                title="Abrir diretamente em nova aba do navegador"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Nova Aba</span>
              </a>
            </div>
          </div>
        )}

        {/* Video / Embed Display Area */}
        <div className="relative bg-black aspect-video w-full flex items-center justify-center overflow-hidden">
          {isEmbedPage ? (
            /* Web Embed Player (EmbedTv / HTML5 Stream Wrapper) */
            <iframe
              key={`iframe-${embedIframeSrc}-${reloadKey}`}
              ref={iframeRef}
              src={embedIframeSrc}
              title={channel.name}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={() => setPlayerStatus('playing')}
            />
          ) : (
            /* Raw Video Element (.ts / .m3u8) */
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              controls
              autoPlay
              onPlaying={() => setPlayerStatus('playing')}
              onError={() => {
                setPlayerStatus('error');
                setErrorMessage('Não foi possível decodificar o vídeo diretamente.');
              }}
            />
          )}

          {/* Error Banner overlay if raw stream fails */}
          {playerStatus === 'error' && !isEmbedPage && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
              <Tv className="w-12 h-12 text-red-500 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">
                Não foi possível reproduzir no reprodutor interno
              </h4>
              <p className="text-xs text-slate-400 max-w-md mb-5">
                {errorMessage ||
                  'Este link pode necessitar ser aberto diretamente no navegador ou em um player externo.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir em Nova Aba</span>
                </a>
                <button
                  onClick={handleOpenPopup}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 shadow transition"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Abrir Pop-up</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls & Channel Navigation */}
        <div className="bg-[#1e293b] border-t border-slate-700/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Channel switcher buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={onPrevChannel}
              disabled={!onPrevChannel}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-300 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
            <button
              onClick={onNextChannel}
              disabled={!onNextChannel}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-300 rounded-lg transition"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleReload}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition"
              title="Recarregar player"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Recarregar</span>
            </button>

            <button
              onClick={copyChannelUrl}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition"
              title="Copiar URL direta"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Copiar Link</span>
                </>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Tela cheia (F)"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Helpful user advice for embed links */}
        <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 truncate">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              Link direto:{' '}
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline"
              >
                {rawUrl}
              </a>
            </span>
          </div>
          <span className="shrink-0 text-slate-500 hidden sm:inline pl-2">
            Pressione Esc para fechar
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
