import React, { useState, useMemo } from 'react';
import { AssetPocket, CurrencyPocketSummary } from '../../types/ledger';
import { PocketCard } from './PocketCard';
import {
  Plus,
  Search,
  SlidersHorizontal,
  GripVertical,
} from 'lucide-react';

interface PocketGridProps {
  pockets: CurrencyPocketSummary[];
  rawPockets?: AssetPocket[];
  onReorderPockets?: (newPockets: AssetPocket[]) => void;
  onSelectPocket: (pocketId: string) => void;
  onOpenPocketManager: () => void;
}

export const PocketGrid: React.FC<PocketGridProps> = ({
  pockets,
  rawPockets,
  onReorderPockets,
  onSelectPocket,
  onOpenPocketManager,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isReorderingMode, setIsReorderingMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);

  // Filter pockets based on search input
  const filteredPockets = useMemo(() => {
    if (!searchTerm.trim()) return pockets;
    const query = searchTerm.toLowerCase();
    return pockets.filter((pocket) => {
      const matchCurr = pocket.currency.toLowerCase().includes(query);
      const matchName = (pocket.name || pocket.currencyName).toLowerCase().includes(query);
      const matchCust = pocket.defaultCustodian
        ? pocket.defaultCustodian.toLowerCase().includes(query)
        : false;
      const matchInst = pocket.instrumentType
        ? pocket.instrumentType.toLowerCase().includes(query)
        : false;
      return matchCurr || matchName || matchCust || matchInst;
    });
  }, [pockets, searchTerm]);

  // Unified reorder logic
  const handleDrop = (dropIndex: number, overrideSourceIndex?: number) => {
    const sourceIdxToUse = overrideSourceIndex !== undefined ? overrideSourceIndex : draggedIndex;
    if (sourceIdxToUse === null || sourceIdxToUse === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setTouchStartIndex(null);
      return;
    }

    const currentList = rawPockets || [];
    if (currentList.length === 0 || !onReorderPockets) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setTouchStartIndex(null);
      return;
    }

    const sourcePocket = filteredPockets[sourceIdxToUse];
    const targetPocket = filteredPockets[dropIndex];
    if (!sourcePocket || !targetPocket) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setTouchStartIndex(null);
      return;
    }

    const updated = [...currentList];
    const sourceIdx = updated.findIndex((p) =>
      sourcePocket.pocketId
        ? p.id === sourcePocket.pocketId
        : (p.currencyCode || '').toUpperCase() === (sourcePocket.currency || '').toUpperCase()
    );
    const targetIdx = updated.findIndex((p) =>
      targetPocket.pocketId
        ? p.id === targetPocket.pocketId
        : (p.currencyCode || '').toUpperCase() === (targetPocket.currency || '').toUpperCase()
    );

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      onReorderPockets(updated);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartIndex(null);
  };

  // Mobile Touch Reordering Handlers
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isReorderingMode) return;
    setTouchStartIndex(index);
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isReorderingMode || touchStartIndex === null) return;
    const touch = e.touches[0];
    const targetElem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetElem) return;

    const card = targetElem.closest('[data-pocket-index]');
    if (card) {
      const targetIndex = Number(card.getAttribute('data-pocket-index'));
      if (!isNaN(targetIndex) && targetIndex !== dragOverIndex) {
        setDragOverIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isReorderingMode || touchStartIndex === null) return;
    if (dragOverIndex !== null && dragOverIndex !== touchStartIndex) {
      handleDrop(dragOverIndex, touchStartIndex);
    } else {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setTouchStartIndex(null);
    }
  };

  const handleTouchCancel = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartIndex(null);
  };

  return (
    <section aria-label="Semua Kantong Valas dan Aset" className="space-y-4">
      {/* 1. Header Toolbar: Search, Atur Posisi Toggle, and Kelola Kantong */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kantong valas, kustodian, atau nama aset..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-[#32A89C] transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Toggle Button "Atur Posisi" */}
          {onReorderPockets && (
            <button
              type="button"
              onClick={() => {
                setIsReorderingMode(!isReorderingMode);
                setDraggedIndex(null);
                setDragOverIndex(null);
                setTouchStartIndex(null);
              }}
              className={`inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs active:scale-[0.98] ${
                isReorderingMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-700 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:text-slate-900'
              }`}
              title={isReorderingMode ? 'Selesai mengatur urutan posisi kantong' : 'Atur urutan posisi kantong'}
            >
              {isReorderingMode ? (
                <>
                  <span className="mr-1.5 font-bold">✓</span>
                  <span>Selesai</span>
                </>
              ) : (
                <>
                  <span className="mr-1.5 font-bold">⇅</span>
                  <span>Atur Posisi</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPocketManager}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Kelola Kantong</span>
          </button>
        </div>
      </div>

      {/* Reorder Mode Guidance Banner (Murni info tipis) */}
      {isReorderingMode && (
        <div className="bg-emerald-50/90 border border-emerald-200/90 text-emerald-900 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <GripVertical className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium text-emerald-800">
            Geser kartu untuk mengubah urutan posisi.
          </span>
        </div>
      )}

      {/* 2. Responsive Grid or Empty State */}
      {filteredPockets.length === 0 && searchTerm.trim() ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              Tidak ada kantong yang cocok dengan pencarian
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Kata kunci &ldquo;{searchTerm}&rdquo; tidak cocok dengan nama kantong, mata uang, atau kustodian.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch w-full">
          {filteredPockets.map((pocket, index) => {
            const isBeingDragged = draggedIndex === index;
            const isDragTarget = dragOverIndex === index && draggedIndex !== index;

            return (
              <PocketCard
                key={pocket.pocketId}
                pocket={pocket}
                index={index}
                isReorderingMode={isReorderingMode}
                isBeingDragged={isBeingDragged}
                isDragTarget={isDragTarget}
                onSelectPocket={onSelectPocket}
                onDragStart={(e) => {
                  if (!isReorderingMode) return;
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(index));
                  setDraggedIndex(index);
                }}
                onDragOver={(e) => {
                  if (!isReorderingMode) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => {
                  if (!isReorderingMode) return;
                  if (dragOverIndex === index) {
                    setDragOverIndex(null);
                  }
                }}
                onDrop={(e) => {
                  if (!isReorderingMode) return;
                  e.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              />
            );
          })}

          {/* Quick Add Pocket Card at end of grid */}
          {!isReorderingMode && (
            <button
              type="button"
              onClick={onOpenPocketManager}
              className="h-full min-h-[220px] sm:min-h-[240px] w-full self-stretch border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 text-slate-400 hover:text-emerald-700 bg-slate-50/40 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">
                {pockets.length === 0 ? '+ Tambah Kantong Pertama' : '+ Tambah Kantong'}
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  );
};
