import React, { useState, useEffect } from 'react';
import {
  Package,
  FileSpreadsheet,
  ArrowRightLeft,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Search,
  Edit3,
  X,
  AlertTriangle,
} from 'lucide-react';
import { AuditItem, Product, OrderItem, OrderFailure, BarcodeAlias } from '../types';
import { storageService } from '../services/storage';
import { younmeOrderService, OrderProgressEvent } from '../services/younmeOrderService';
import { cloudSyncService, SyncStatus } from '../services/cloudSyncService';
import { UnmappedGallery } from '../components/UnmappedGallery';
import { BarcodeAliasModal } from '../components/BarcodeAliasModal';
import { OrderFailureModal } from '../components/OrderFailureModal';
import { ProductStockSetupModal } from '../components/ProductStockSetupModal';

export const AdminDashboard: React.FC = () => {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [aliases, setAliases] = useState<BarcodeAlias[]>([]);
  const [failures, setFailures] = useState<OrderFailure[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 발주 수량 임시 조정 (barcode -> finalQty)
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('DISCONNECTED');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isRefreshingSync, setIsRefreshingSync] = useState(false);

  const [showUnmappedModal, setShowUnmappedModal] = useState(false);
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [aliasTargetBarcode, setAliasTargetBarcode] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showStockSetupModal, setShowStockSetupModal] = useState(false);

  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const [isOrdering, setIsOrdering] = useState(false);
  const [orderProgress, setOrderProgress] = useState<OrderProgressEvent | null>(null);
  const [tempFilter, setTempFilter] = useState<'ALL' | 'AMBIENT' | 'CHILLED'>('ALL');

  const loadData = () => {
    setAudits(storageService.getAudits());
    setProducts(storageService.getProducts());
    setAliases(storageService.getAliases());
    setFailures(storageService.getOrderFailures());
  };

  useEffect(() => {
    loadData();

    cloudSyncService.connect(undefined, 'ADMIN');

    const unsubSync = cloudSyncService.onSync((newAudits) => {
      setAudits(newAudits);
    });

    const unsubStatus = cloudSyncService.onStatusChange((st, time) => {
      setSyncStatus(st);
      if (time) setLastSyncTime(time);
    });

    return () => {
      unsubSync();
      unsubStatus();
    };
  }, []);

  // 발주 대상 계산 — 부족분을 최소 발주단위의 배수로 올림
  const orderItems: OrderItem[] = audits.map((audit) => {
    const { product, alias } = storageService.findProduct(audit.barcode);

    const targetStock =
      audit.targetStock !== undefined ? audit.targetStock : product ? product.targetStock : 10;

    const minOrderQty =
      audit.minOrderQty !== undefined
        ? Math.max(1, audit.minOrderQty)
        : product
          ? Math.max(1, product.minOrderQty)
          : 1;

    const shortage = Math.max(0, targetStock - audit.stockCount);

    const recommendedQty =
      shortage > 0 ? Math.ceil(shortage / minOrderQty) * minOrderQty : 0;

    const finalOrderQty =
      customQuantities[audit.barcode] !== undefined
        ? customQuantities[audit.barcode]
        : recommendedQty;

    const isBelowMinQty = finalOrderQty > 0 && finalOrderQty < minOrderQty;
    const isNotMultiple = finalOrderQty > 0 && finalOrderQty % minOrderQty !== 0;

    return {
      barcode: audit.barcode,
      productName: audit.productName,
      currentStock: audit.stockCount,
      targetStock,
      recommendedQty,
      finalOrderQty,
      minOrderQty,
      isBelowMinQty: isBelowMinQty || isNotMultiple,
      usingAliasBarcode: alias?.newBarcode,
      category: product ? product.category : '기타',
      cost: product ? product.cost : 0,
      price: product ? product.price : 0,
      status: 'PENDING',
    };
  });

  const itemsToOrder = orderItems.filter((item) => item.finalOrderQty > 0);

  const handleSnapToMultiple = (barcode: string, val: number, minQty: number) => {
    const step = Math.max(1, minQty);
    setCustomQuantities((prev) => ({
      ...prev,
      [barcode]: Math.ceil(Math.max(1, val) / step) * step,
    }));
  };

  // 증감은 최소 발주단위 배수로만
  const handleStepQty = (
    barcode: string,
    currentVal: number,
    minQty: number,
    direction: 1 | -1
  ) => {
    const step = Math.max(1, minQty);
    const next =
      direction > 0
        ? Math.floor(currentVal / step) * step + step
        : Math.max(0, Math.ceil(currentVal / step) * step - step);

    setCustomQuantities((prev) => ({ ...prev, [barcode]: next }));
  };

  const handleQuantityChange = (barcode: string, val: number) => {
    setCustomQuantities((prev) => ({ ...prev, [barcode]: Math.max(0, val) }));
  };

  const handleTargetStockChange = (barcode: string, val: number) => {
    storageService.updateProductTargetStock(barcode, Math.max(0, val));
    loadData();
  };

  const handleMinOrderQtyChange = (barcode: string, val: number) => {
    storageService.updateProductMinOrderQty(barcode, Math.max(1, val));
    loadData();
  };

  const handleRemoveFromOrder = (barcode: string) => {
    storageService.deleteAudit(barcode);
    const updated = storageService.getAudits();
    loadData();
    cloudSyncService.broadcastAudits(updated, 'ADMIN');
  };

  const handleClearAllAudits = () => {
    if (!confirm('실사 목록을 모두 비웁니다. 매장 폰의 목록도 함께 지워집니다.')) return;
    storageService.clearAudits();
    setCustomQuantities({});
    loadData();
    cloudSyncService.broadcastClear('ADMIN');
  };

  const handleRefreshCloudSync = () => {
    setIsRefreshingSync(true);
    cloudSyncService.connect(undefined, 'ADMIN');
    loadData();
    setTimeout(() => setIsRefreshingSync(false), 600);
  };

  const handleStartEditName = (barcode: string, currentName: string) => {
    setEditingBarcode(barcode);
    setEditingName(currentName === '미등록 상품' ? '' : currentName);
  };

  const handleSaveName = (barcode: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      storageService.registerProductName(barcode, trimmed);
      loadData();
    }
    setEditingBarcode(null);
    setEditingName('');
  };

  const handleStartOrder = async () => {
    if (itemsToOrder.length === 0) {
      alert('발주할 상품이 없습니다.');
      return;
    }

    // 전송 직전 모든 수량을 최소 발주단위 배수로 보정
    const sanitizedItems: OrderItem[] = itemsToOrder.map((item) => {
      const step = Math.max(1, item.minOrderQty);
      return {
        ...item,
        finalOrderQty:
          item.finalOrderQty > 0 ? Math.ceil(item.finalOrderQty / step) * step : 0,
      };
    });

    let hasBot = false;
    try {
      const ping = await fetch('http://localhost:3001/api/health');
      if (ping.ok) hasBot = true;
    } catch {
      // 봇이 꺼져 있으면 계정 정보로 진행
    }

    const settings = storageService.getSettings();
    if (!hasBot && (!settings.younmeId || !settings.younmePw)) {
      alert('설정에서 유앤미24 계정을 먼저 입력해 주세요.');
      return;
    }

    if (!confirm(`${sanitizedItems.length}개 품목을 유앤미24로 발주합니다.`)) return;

    setIsOrdering(true);
    setOrderProgress(null);

    try {
      const result = await younmeOrderService.executeOrder(sanitizedItems, (evt) => {
        setOrderProgress(evt);
      });

      loadData();
      if (result.failures.length > 0) {
        setShowFailureModal(true);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '발주 중 오류가 발생했습니다.');
    } finally {
      setIsOrdering(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await storageService.importExcelFile(file);
      alert(`${result.count}개 상품을 불러왔습니다.`);
      loadData();
    } catch {
      alert('엑셀 파일을 읽지 못했습니다.');
    }
  };

  const unmappedAudits = audits.filter((a) => a.isUnmapped);

  const filteredItems = orderItems.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery);

    const isChilled = Boolean(
      item.category?.includes('냉동') || item.category?.includes('저온')
    );
    let matchesTemp = true;
    if (tempFilter === 'AMBIENT') matchesTemp = !isChilled;
    if (tempFilter === 'CHILLED') matchesTemp = isChilled;

    return matchesSearch && matchesTemp;
  });

  const isConnected = syncStatus === 'CONNECTED';

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 space-y-8 pb-24">
      {/* 요약 */}
      <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
          <div>
            <p className="text-sm text-ink-faint">실사 품목</p>
            <p className="mt-1 text-[32px] leading-none font-semibold text-ink tabular">
              {audits.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-ink-faint">발주 예정</p>
            <p className="mt-1 text-[32px] leading-none font-semibold text-sage tabular">
              {itemsToOrder.length}
            </p>
          </div>

          {unmappedAudits.length > 0 && (
            <button
              onClick={() => setShowUnmappedModal(true)}
              className="text-left group"
            >
              <p className="text-sm text-ink-faint group-hover:text-ink-soft transition-colors">
                이름 없는 상품
              </p>
              <p className="mt-1 text-[32px] leading-none font-semibold text-clay tabular underline decoration-clay/30 underline-offset-4">
                {unmappedAudits.length}
              </p>
            </button>
          )}

          {failures.length > 0 && (
            <button onClick={() => setShowFailureModal(true)} className="text-left group">
              <p className="text-sm text-ink-faint group-hover:text-ink-soft transition-colors">
                발주 실패
              </p>
              <p className="mt-1 text-[32px] leading-none font-semibold text-brick tabular underline decoration-brick/30 underline-offset-4">
                {failures.length}
              </p>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-[13px] text-ink-faint">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-sage' : 'bg-clay'}`}
              aria-hidden
            />
            {isConnected ? '매장과 연결됨' : '연결 중'}
            {lastSyncTime && ` · ${lastSyncTime}`}
          </span>
          <button
            type="button"
            onClick={handleRefreshCloudSync}
            disabled={isRefreshingSync}
            className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSync ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </section>

      {/* 발주 실행 */}
      <section className="bg-surface border border-line rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">유앤미24 발주</h2>
          <p className="mt-1 text-sm text-ink-soft leading-relaxed break-keep">
            스캔한 재고를 기준으로 부족한 수량을 최소 발주단위의 배수로 계산했습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowStockSetupModal(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium text-ink-soft hover:text-ink hover:bg-sunken transition-colors"
          >
            <Package className="w-4 h-4" />
            목표 재고
            <span className="text-ink-faint tabular">{products.length}</span>
          </button>

          <button
            onClick={() => {
              setAliasTargetBarcode('');
              setShowAliasModal(true);
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium text-ink-soft hover:text-ink hover:bg-sunken transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            대체 바코드
            <span className="text-ink-faint tabular">{aliases.length}</span>
          </button>

          <label className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium text-ink-soft hover:text-ink hover:bg-sunken cursor-pointer transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            엑셀 불러오기
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>

          <button
            disabled={isOrdering || itemsToOrder.length === 0}
            onClick={handleStartOrder}
            className="h-10 px-6 rounded-full bg-sage hover:bg-sage-deep disabled:bg-sunken disabled:text-ink-faint text-white text-sm font-medium transition-colors"
          >
            {isOrdering ? '발주 중' : `${itemsToOrder.length}개 발주하기`}
          </button>
        </div>
      </section>

      {/* 발주 진행 */}
      {orderProgress && (
        <section className="bg-surface border border-line rounded-2xl p-5 space-y-3 animate-settle">
          <div className="flex justify-between items-center gap-4 text-sm">
            <span className="text-ink break-keep">{orderProgress.message}</span>
            <span className="text-ink-faint tabular shrink-0">{orderProgress.percent}%</span>
          </div>
          <div className="w-full h-1 bg-sunken rounded-full overflow-hidden">
            <div
              className="h-full bg-sage rounded-full transition-all duration-300"
              style={{ width: `${orderProgress.percent}%` }}
            />
          </div>
        </section>
      )}

      {/* 목록 */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm">
            {(
              [
                ['ALL', '전체'],
                ['AMBIENT', '상온'],
                ['CHILLED', '냉장'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTempFilter(key)}
                className={`h-9 px-4 rounded-full font-medium transition-colors ${
                  tempFilter === key
                    ? 'bg-ink text-white'
                    : 'text-ink-soft hover:bg-sunken'
                }`}
              >
                {label}
              </button>
            ))}
            {audits.length > 0 && (
              <button
                onClick={handleClearAllAudits}
                className="h-9 px-4 rounded-full font-medium text-ink-faint hover:text-brick hover:bg-brick-soft transition-colors"
              >
                목록 비우기
              </button>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="상품명 또는 바코드"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="상품 검색"
              className="w-full h-10 pl-10 pr-4 rounded-full bg-surface border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-faint">
            {orderItems.length === 0
              ? '매장에서 스캔한 재고가 아직 없습니다'
              : '검색 결과가 없습니다'}
          </p>
        ) : (
          <div className="bg-surface border border-line rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[13px] text-ink-faint border-b border-line">
                    <th className="font-medium px-5 py-3">상품</th>
                    <th className="font-medium px-3 py-3 text-right whitespace-nowrap">재고</th>
                    <th className="font-medium px-3 py-3 text-center whitespace-nowrap">목표</th>
                    <th className="font-medium px-3 py-3 text-center whitespace-nowrap">
                      발주단위
                    </th>
                    <th className="font-medium px-3 py-3 text-right whitespace-nowrap">추천</th>
                    <th className="font-medium px-3 py-3 text-center whitespace-nowrap">
                      발주 수량
                    </th>
                    <th className="px-3 py-3">
                      <span className="sr-only">제외</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredItems.map((item) => {
                    const audit = audits.find((a) => a.barcode === item.barcode);
                    const isUnregistered =
                      item.productName === '미등록 상품' || !item.productName;

                    return (
                      <tr key={item.barcode} className="hover:bg-canvas/60 transition-colors">
                        {/* 상품 */}
                        <td className="px-5 py-3 max-w-md">
                          {editingBarcode === item.barcode ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveName(item.barcode);
                                  if (e.key === 'Escape') setEditingBarcode(null);
                                }}
                                placeholder="상품명"
                                autoFocus
                                className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-canvas border border-sage-300 text-sm text-ink focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveName(item.barcode)}
                                className="h-9 px-3 rounded-lg bg-sage hover:bg-sage-deep text-white text-[13px] font-medium shrink-0 transition-colors"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBarcode(null)}
                                className="h-9 px-2 text-[13px] text-ink-faint hover:text-ink shrink-0 transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 group">
                              {audit?.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(audit.photoUrl!)}
                                  className="w-9 h-9 rounded-lg overflow-hidden border border-line shrink-0"
                                  aria-label="촬영한 사진 보기"
                                >
                                  <img
                                    src={audit.photoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              )}

                              <span className="min-w-0">
                                <span
                                  className={`block leading-snug break-keep ${
                                    isUnregistered ? 'text-clay' : 'text-ink'
                                  }`}
                                >
                                  {item.productName}
                                </span>
                                <span className="block mt-0.5 text-[13px] text-ink-faint tabular">
                                  {item.barcode}
                                  {item.usingAliasBarcode && ` → ${item.usingAliasBarcode}`}
                                </span>
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleStartEditName(item.barcode, item.productName)
                                }
                                aria-label="상품명 수정"
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  isUnregistered
                                    ? 'text-clay hover:bg-clay-soft'
                                    : 'text-ink-faint hover:text-ink hover:bg-sunken opacity-0 group-hover:opacity-100 focus:opacity-100'
                                }`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 재고 */}
                        <td className="px-3 py-3 text-right text-ink tabular whitespace-nowrap">
                          {item.currentStock}
                        </td>

                        {/* 목표 재고 */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.targetStock}
                            onChange={(e) =>
                              handleTargetStockChange(
                                item.barcode,
                                parseInt(e.target.value) || 0
                              )
                            }
                            aria-label="목표 재고"
                            className="w-14 h-9 text-center rounded-lg bg-canvas border border-line text-ink tabular focus:outline-none focus:border-sage-300 transition-colors"
                          />
                        </td>

                        {/* 최소 발주단위 */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.minOrderQty}
                            onChange={(e) =>
                              handleMinOrderQtyChange(
                                item.barcode,
                                parseInt(e.target.value) || 1
                              )
                            }
                            aria-label="최소 발주단위"
                            className="w-14 h-9 text-center rounded-lg bg-canvas border border-line text-ink tabular focus:outline-none focus:border-sage-300 transition-colors"
                          />
                        </td>

                        {/* 추천 */}
                        <td className="px-3 py-3 text-right tabular whitespace-nowrap">
                          <span className={item.recommendedQty > 0 ? 'text-ink' : 'text-ink-faint'}>
                            {item.recommendedQty}
                          </span>
                        </td>

                        {/* 발주 수량 */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="inline-flex items-center rounded-full border border-line overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStepQty(
                                    item.barcode,
                                    item.finalOrderQty,
                                    item.minOrderQty,
                                    -1
                                  )
                                }
                                disabled={item.finalOrderQty <= 0}
                                aria-label={`${item.minOrderQty}개 감소`}
                                className="w-9 h-9 text-ink-soft hover:bg-sunken disabled:text-ink-faint disabled:hover:bg-transparent transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                step={item.minOrderQty}
                                value={item.finalOrderQty}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.barcode,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                aria-label="발주 수량"
                                className={`w-14 h-9 text-center bg-transparent tabular focus:outline-none ${
                                  item.finalOrderQty > 0 ? 'text-ink font-medium' : 'text-ink-faint'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleStepQty(
                                    item.barcode,
                                    item.finalOrderQty,
                                    item.minOrderQty,
                                    1
                                  )
                                }
                                aria-label={`${item.minOrderQty}개 증가`}
                                className="w-9 h-9 text-ink-soft hover:bg-sunken transition-colors"
                              >
                                +
                              </button>
                            </div>

                            {item.isBelowMinQty && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSnapToMultiple(
                                    item.barcode,
                                    item.finalOrderQty,
                                    item.minOrderQty
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[13px] text-clay hover:underline whitespace-nowrap"
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {item.minOrderQty}개 단위로 맞추기
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 제외 */}
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromOrder(item.barcode)}
                            aria-label={`${item.productName} 발주 목록에서 제외`}
                            className="w-9 h-9 rounded-full text-ink-faint hover:text-brick hover:bg-brick-soft flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {showUnmappedModal && (
        <UnmappedGallery
          unmappedAudits={unmappedAudits}
          onProductMapped={loadData}
          onClose={() => setShowUnmappedModal(false)}
        />
      )}

      {showAliasModal && (
        <BarcodeAliasModal
          initialOldBarcode={aliasTargetBarcode}
          onClose={() => setShowAliasModal(false)}
        />
      )}

      {showFailureModal && (
        <OrderFailureModal
          failures={failures}
          onUpdate={loadData}
          onClose={() => setShowFailureModal(false)}
          onOpenAliasModal={(code) => {
            setShowFailureModal(false);
            setAliasTargetBarcode(code);
            setShowAliasModal(true);
          }}
        />
      )}

      {showStockSetupModal && (
        <ProductStockSetupModal
          onClose={() => setShowStockSetupModal(false)}
          onUpdated={loadData}
        />
      )}

      {/* 사진 크게 보기 */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-5"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="bg-surface rounded-2xl max-w-sm w-full overflow-hidden shadow-xl animate-settle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 h-14 flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                <ImageIcon className="w-4 h-4 text-ink-faint" />
                촬영한 사진
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                aria-label="닫기"
                className="w-9 h-9 -mr-2 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewPhotoUrl}
              alt="촬영한 상품 사진"
              className="w-full max-h-96 object-contain bg-sunken"
            />
          </div>
        </div>
      )}
    </div>
  );
};
