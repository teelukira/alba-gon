import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRightLeft,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Send,
  AlertOctagon,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import { AuditItem, Product, OrderItem, OrderFailure, BarcodeAlias } from '../types';
import { storageService } from '../services/storage';
import { younmeOrderService, OrderProgressEvent } from '../services/younmeOrderService';
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

  // 발주 수량 임시 조정 맵 (barcode -> finalQty)
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  // 모달 상태
  const [showUnmappedModal, setShowUnmappedModal] = useState(false);
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [aliasTargetBarcode, setAliasTargetBarcode] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showStockSetupModal, setShowStockSetupModal] = useState(false);

  // 발주 진행 상태
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderProgress, setOrderProgress] = useState<OrderProgressEvent | null>(null);

  const loadData = () => {
    setAudits(storageService.getAudits());
    setProducts(storageService.getProducts());
    setAliases(storageService.getAliases());
    setFailures(storageService.getOrderFailures());
  };

  useEffect(() => {
    loadData();
  }, []);

  const [tempFilter, setTempFilter] = useState<'ALL' | 'AMBIENT' | 'CHILLED'>('ALL');

  // 발주 대상 품목 계산
  const orderItems: OrderItem[] = audits.map((audit) => {
    const { product, alias } = storageService.findProduct(audit.barcode);
    const targetStock = product ? product.targetStock : 10;
    const minOrderQty = product ? product.minOrderQty : 1;
    const recommendedQty = Math.max(0, targetStock - audit.stockCount);

    // 사장님이 직접 수정한 수량이 있으면 사용, 없으면 추천 수량
    const finalOrderQty = customQuantities[audit.barcode] !== undefined
      ? customQuantities[audit.barcode]
      : recommendedQty;

    const isBelowMinQty = finalOrderQty > 0 && finalOrderQty < minOrderQty;

    return {
      barcode: audit.barcode,
      productName: audit.productName,
      currentStock: audit.stockCount,
      targetStock,
      recommendedQty,
      finalOrderQty,
      minOrderQty,
      isBelowMinQty,
      usingAliasBarcode: alias?.newBarcode,
      category: product ? product.category : '기타',
      status: 'PENDING',
    };
  });

  // 최종 주문할 품목들 (수량 > 0)
  const itemsToOrder = orderItems.filter((item) => item.finalOrderQty > 0);

  // 최소 발주량으로 수량 즉시 올리기
  const handleFillMinQty = (barcode: string, minQty: number) => {
    setCustomQuantities((prev) => ({
      ...prev,
      [barcode]: minQty,
    }));
  };

  // 수량 직접 변경 핸들러
  const handleQuantityChange = (barcode: string, val: number) => {
    setCustomQuantities((prev) => ({
      ...prev,
      [barcode]: Math.max(0, val),
    }));
  };

  // 사장님 요청: 최소 발주단위 실시간 인라인 수정 핸들러
  const handleMinOrderQtyChange = (barcode: string, val: number) => {
    storageService.updateProductMinOrderQty(barcode, Math.max(1, val));
    loadData();
  };

  // 사장님 요청: 발주 리스트에서 특정 상품 즉시 제외/삭제
  const handleRemoveFromOrder = (barcode: string) => {
    storageService.deleteAudit(barcode);
    loadData();
  };

  // 유앤미24 자동 발주 실행
  const handleStartOrder = async () => {
    if (itemsToOrder.length === 0) {
      alert('발주할 상품이 없습니다. (발주 수량이 모두 0개입니다)');
      return;
    }

    let hasBot = false;
    try {
      const ping = await fetch('http://localhost:3001/api/health');
      if (ping.ok) hasBot = true;
    } catch {}

    const settings = storageService.getSettings();
    if (!hasBot && (!settings.younmeId || !settings.younmePw)) {
      alert('유앤미24 아이디와 비밀번호가 비어있습니다. 우측 상단 톱니바퀴 설정에서 계정을 먼저 입력해주세요!');
      return;
    }

    if (!confirm(`총 ${itemsToOrder.length}개 품목을 유앤미24에 자동으로 로그인하여 발주하시겠습니까?`)) {
      return;
    }

    setIsOrdering(true);
    setOrderProgress(null);

    try {
      const result = await younmeOrderService.executeOrder(itemsToOrder, (evt) => {
        setOrderProgress(evt);
      });

      loadData();
      if (result.failures.length > 0) {
        setShowFailureModal(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '발주 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setIsOrdering(false);
    }
  };

  // 엑셀 파일 업로드 파싱
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await storageService.importExcelFile(file);
      alert(`성공적으로 엑셀을 불러왔습니다! (총 ${result.count}개 처리, 신규 상품 등록 완료)`);
      loadData();
    } catch (err) {
      alert('엑셀 파일을 읽는 도중 오류가 발생했습니다.');
    }
  };

  // 미등록 상품 수
  const unmappedAudits = audits.filter((a) => a.isUnmapped);

  const filteredItems = orderItems.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery);

    const isChilled = Boolean(item.category?.includes('냉동') || item.category?.includes('저온'));
    let matchesTemp = true;
    if (tempFilter === 'AMBIENT') matchesTemp = !isChilled;
    if (tempFilter === 'CHILLED') matchesTemp = isChilled;

    return matchesSearch && matchesTemp;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. 상단 대시보드 요약 및 빠른 액션 바 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* 오늘 실사 재고 품목 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span>실사 품목</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">{audits.length}</span>
            <span className="text-[11px] text-slate-500 ml-1">개 확인됨</span>
          </div>
        </div>

        {/* 발주 예정 품목 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span>발주 예정</span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400">{itemsToOrder.length}</span>
            <span className="text-[11px] text-slate-500 ml-1">개 품목</span>
          </div>
        </div>

        {/* 미등록 상품 사진 검수 카드 */}
        <button
          onClick={() => setShowUnmappedModal(true)}
          className={`rounded-2xl p-4 flex flex-col justify-between text-left transition-all border ${
            unmappedAudits.length > 0
              ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start text-slate-400">
            <span>미등록 사진 검수</span>
            <ImageIcon className={`w-4 h-4 ${unmappedAudits.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-2xl font-bold ${unmappedAudits.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {unmappedAudits.length}
            </span>
            {unmappedAudits.length > 0 && (
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                이름 등록
              </span>
            )}
          </div>
        </button>

        {/* 발주 실패 관리함 카드 */}
        <button
          onClick={() => setShowFailureModal(true)}
          className={`rounded-2xl p-4 flex flex-col justify-between text-left transition-all border ${
            failures.length > 0
              ? 'bg-rose-950/40 border-rose-500/60 hover:border-rose-400 animate-pulse'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start text-slate-400">
            <span>발주 실패 관리함</span>
            <AlertOctagon className={`w-4 h-4 ${failures.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-2xl font-bold ${failures.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {failures.length}
            </span>
            {failures.length > 0 && (
              <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">
                조치 필요
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 2. 사장님 핵심 제어판 (발주 실행 버튼 + 관리 도구들) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white">유앤미24 원클릭 자동 발주</h2>
            <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
              월/목 22시 정기발주
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            알바가 스캔한 재고를 기준으로 추천 수량이 산출되었습니다. 최소 발주량을 확인하고 발주를 실행하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 제품별 추천 재고수량 셋업 버튼 */}
          <button
            onClick={() => setShowStockSetupModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>제품별 추천재고 셋업 ({products.length})</span>
          </button>

          {/* 구형-신규 대체 바코드 관리 버튼 */}
          <button
            onClick={() => {
              setAliasTargetBarcode('');
              setShowAliasModal(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>대체 바코드 ({aliases.length})</span>
          </button>

          {/* 엑셀 파일 업로드 버튼 */}
          <label className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>발주 엑셀 업로드</span>
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>

          {/* 메인 발주 실행 버튼 */}
          <button
            disabled={isOrdering || itemsToOrder.length === 0}
            onClick={handleStartOrder}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center space-x-2"
          >
            {isOrdering ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>발주 진행중...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>유앤미24 자동 발주 ({itemsToOrder.length}건)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. 자동 발주 진행 프로그레스 바 (발주 중일 때 표시) */}
      {orderProgress && (
        <div className="bg-slate-900 border border-blue-500/50 rounded-2xl p-4 text-white shadow-xl animate-fade-in space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-blue-300 flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{orderProgress.message}</span>
            </span>
            <span className="font-mono font-bold text-blue-400">{orderProgress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-sm shadow-blue-500"
              style={{ width: `${orderProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. 재고 실사 및 발주 추천 테이블 */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-sm text-white">매장 실사 재고 & 발주 목록</h3>
            </div>

            {/* 유앤미24 상온/저온 전용 발주 탭 */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTempFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tempFilter === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                전체 ({orderItems.length})
              </button>
              <button
                onClick={() => setTempFilter('AMBIENT')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tempFilter === 'AMBIENT' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                상온상품 (/app1/)
              </button>
              <button
                onClick={() => setTempFilter('CHILLED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tempFilter === 'CHILLED' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                저온냉장 (/app3/)
              </button>
            </div>
          </div>

          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="상품명 또는 바코드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {orderItems.length === 0 ? '알바가 스캔한 재고 실사 데이터가 없습니다.' : '검색 결과가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-3.5">바코드 / 대체</th>
                  <th className="p-3.5">상품명</th>
                  <th className="p-3.5 text-center">알바 실사 재고</th>
                  <th className="p-3.5 text-center">목표 안전재고</th>
                  <th className="p-3.5 text-center">최소 발주단위</th>
                  <th className="p-3.5 text-center">추천 수량</th>
                  <th className="p-3.5 text-right">최종 발주 수량</th>
                  <th className="p-3.5 text-center">발주제외</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.barcode} className="hover:bg-slate-800/40 transition-colors">
                    {/* 바코드 */}
                    <td className="p-3.5 font-mono text-[11px]">
                      <div className="space-y-0.5">
                        <span className="text-slate-300">{item.barcode}</span>
                        {item.usingAliasBarcode && (
                          <div className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>대체: {item.usingAliasBarcode}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 상품명 */}
                    <td className="p-3.5 font-medium text-white">
                      <div className="flex items-center space-x-1.5">
                        <span>{item.productName}</span>
                        {item.productName === '신규/미등록 상품' && (
                          <button
                            onClick={() => setShowUnmappedModal(true)}
                            className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold"
                          >
                            사진확인
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 실사 재고 */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-mono font-bold text-slate-200">
                        {item.currentStock}개
                      </span>
                    </td>

                    {/* 목표 안전재고 */}
                    <td className="p-3.5 text-center text-slate-400 font-mono">
                      {item.targetStock}개
                    </td>

                    {/* 최소 발주량 (MOQ) 인라인 수정 */}
                    <td className="p-3.5 text-center font-mono">
                      <div className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-700/80 rounded-xl px-1.5 py-0.5 shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleMinOrderQtyChange(item.barcode, item.minOrderQty - 1)}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs transition-colors"
                          title="최소발주량 1 감소"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.minOrderQty}
                          onChange={(e) => handleMinOrderQtyChange(item.barcode, parseInt(e.target.value) || 1)}
                          className="w-9 text-center font-mono font-bold text-blue-400 bg-transparent text-xs focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleMinOrderQtyChange(item.barcode, item.minOrderQty + 1)}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs transition-colors"
                          title="최소발주량 1 증가"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-slate-500">개</span>
                      </div>
                    </td>

                    {/* 추천 발주 수량 */}
                    <td className="p-3.5 text-center font-mono">
                      <span className={item.recommendedQty > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {item.recommendedQty}개
                      </span>
                    </td>

                    {/* 최종 발주 수량 & 최소발주량 미달 경고 */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* 최소 발주량 미달 시 경고 + 원클릭 채우기 버튼 */}
                        {item.isBelowMinQty && (
                          <div className="flex items-center space-x-1.5 bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded-xl">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] text-amber-300 font-medium">최소 {item.minOrderQty}개 필요</span>
                            <button
                              type="button"
                              onClick={() => handleFillMinQty(item.barcode, item.minOrderQty)}
                              className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded"
                            >
                              채우기
                            </button>
                          </div>
                        )}

                        {/* 수량 인라인 직접 입력 */}
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="0"
                            value={item.finalOrderQty}
                            onChange={(e) => handleQuantityChange(item.barcode, parseInt(e.target.value) || 0)}
                            className={`w-16 px-2 py-1.5 rounded-xl text-right font-mono font-bold text-xs border focus:outline-hidden ${
                              item.finalOrderQty > 0
                                ? 'bg-slate-950 text-white border-blue-500/60 focus:border-blue-400'
                                : 'bg-slate-900 text-slate-500 border-slate-700'
                            }`}
                          />
                          <span className="text-slate-400 text-xs">개</span>
                        </div>
                      </div>
                    </td>

                    {/* 사장님 요청: 발주 리스트에서 특정 상품 즉시 제외/삭제 */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromOrder(item.barcode)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-500 hover:text-rose-400 active:bg-rose-900 border border-slate-700/60 transition-colors"
                        title="이번 발주 목록에서 제외 (삭제)"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 모달들 */}
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
    </div>
  );
};
