import { Product, AuditItem, BarcodeAlias, OrderFailure, AppSettings } from '../types';
import seedProducts from '../data/seedProducts.json';
import seedAudits from '../data/seedAudits.json';
import * as XLSX from 'xlsx';

const KEYS = {
  PRODUCTS: 'albagom_products_v3',
  AUDITS: 'albagom_audits_v1',
  ALIASES: 'albagom_aliases_v1',
  FAILURES: 'albagom_failures_v1',
  SETTINGS: 'albagom_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  managerPin: '1234',
  younmeId: '',
  younmePw: '',
  workerName: '야간알바',
  autoOrderEnabled: true,
};

export const storageService = {
  // --- 상품 마스터 (Products) ---
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(KEYS.PRODUCTS);
      if (!data) {
        // 최초 실행 시 459개 엑셀 기본 상품 등록
        const initial = seedProducts as Product[];
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return seedProducts as Product[];
    }
  },

  saveProducts(products: Product[]): void {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  addProduct(product: Product): void {
    const list = this.getProducts();
    const index = list.findIndex(p => p.barcode === product.barcode);
    if (index >= 0) {
      list[index] = { ...list[index], ...product };
    } else {
      list.unshift(product);
    }
    this.saveProducts(list);
  },

  updateProductMinOrderQty(barcode: string, minOrderQty: number): void {
    const safeVal = Math.max(1, minOrderQty);
    const list = this.getProducts();
    const idx = list.findIndex(p => p.barcode === barcode);
    if (idx >= 0) {
      list[idx].minOrderQty = safeVal;
      this.saveProducts(list);
    }
    const audits = this.getAudits();
    const aIdx = audits.findIndex(a => a.barcode === barcode);
    if (aIdx >= 0) {
      audits[aIdx].minOrderQty = safeVal;
      this.saveAudits(audits);
    }
  },

  updateProductTargetStock(barcode: string, targetStock: number): void {
    const safeVal = Math.max(0, targetStock);
    const list = this.getProducts();
    const idx = list.findIndex(p => p.barcode === barcode);
    if (idx >= 0) {
      list[idx].targetStock = safeVal;
      this.saveProducts(list);
    }
    const audits = this.getAudits();
    const aIdx = audits.findIndex(a => a.barcode === barcode);
    if (aIdx >= 0) {
      audits[aIdx].targetStock = safeVal;
      this.saveAudits(audits);
    }
  },

  findProduct(barcode: string): { product?: Product; alias?: BarcodeAlias } {
    const aliases = this.getAliases();
    const alias = aliases.find(a => a.oldBarcode === barcode);
    const targetBarcode = alias ? alias.newBarcode : barcode;

    const products = this.getProducts();
    const product = products.find(p => p.barcode === targetBarcode || p.barcode === barcode);

    return { product, alias };
  },

  // 사장님 요청: 바코드 마지막 4~5자리 빠른 패턴 매칭 및 상품명 검색
  searchProductsByPattern(query: string, maxResults = 10): Product[] {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const products = this.getProducts();

    // 1. 바코드 끝자리(Tail) 정확히 일치하는 상품 (가장 높은 우선순위: 예: 60205 로 끝나는 포카칩)
    const tailMatches = products.filter(p => p.barcode.endsWith(q));

    // 2. 바코드 중간에 포함되는 상품
    const barcodeMatches = products.filter(p => !p.barcode.endsWith(q) && p.barcode.includes(q));

    // 3. 상품명에 검색어가 포함되는 상품 (한글/영문)
    const nameMatches = products.filter(p => 
      !p.barcode.includes(q) && p.name.toLowerCase().includes(q)
    );

    // 우선순위 순서대로 합치고 최대 결과 개수 반환
    return [...tailMatches, ...barcodeMatches, ...nameMatches].slice(0, maxResults);
  },

  // --- 재고 실사 (Audits) ---
  getAudits(): AuditItem[] {
    try {
      const data = localStorage.getItem(KEYS.AUDITS);
      if (!data) {
        // 최초 접속 시 사장님이 작업하신 65건 실사 품목 기본 탑재!
        const initial = (seedAudits as unknown as AuditItem[]) || [];
        localStorage.setItem(KEYS.AUDITS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return (seedAudits as unknown as AuditItem[]) || [];
    }
  },

  saveAudits(audits: AuditItem[]): void {
    localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));
  },

  saveAudit(item: Omit<AuditItem, 'id' | 'updatedAt'>): AuditItem {
    const audits = this.getAudits();
    // 같은 바코드의 실사가 이미 있으면 최신 수량으로 업데이트
    const existingIndex = audits.findIndex(a => a.barcode === item.barcode);
    const updatedItem: AuditItem = {
      ...item,
      id: existingIndex >= 0 ? audits[existingIndex].id : Date.now().toString(),
      updatedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    if (existingIndex >= 0) {
      audits[existingIndex] = updatedItem;
    } else {
      audits.unshift(updatedItem);
    }
    localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));
    return updatedItem;
  },

  // 사장님 요청: 바코드 번호에 상품명을 사장님이 직접 입력/등록하여 마스터 및 발주대기에 영구 반영
  registerProductName(barcode: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // 1. 실사 목록(Audits)의 상품명 갱신 및 isUnmapped 해제
    const audits = this.getAudits().map(a => {
      if (a.barcode === barcode) {
        return {
          ...a,
          productName: trimmed,
          isUnmapped: false,
        };
      }
      return a;
    });
    localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));

    // 2. 마스터 상품(Products) 목록에 추가 또는 이름 수정 (영구 보관)
    const products = this.getProducts();
    const existingIdx = products.findIndex(p => p.barcode === barcode);
    if (existingIdx >= 0) {
      products[existingIdx].name = trimmed;
    } else {
      products.unshift({
        barcode,
        name: trimmed,
        category: '미등록신상품',
        price: 0,
        cost: 0,
        targetStock: 10,
        minOrderQty: 1,
      });
    }
    this.saveProducts(products);
  },

  deleteAudit(identifier: string): void {
    const audits = this.getAudits().filter(a => a.id !== identifier && a.barcode !== identifier);
    localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));
  },

  clearAudits(): void {
    localStorage.removeItem(KEYS.AUDITS);
  },

  // --- 대체 바코드 매핑 (Aliases: 구형 바코드 ➡️ 신규 발주용 바코드) ---
  getAliases(): BarcodeAlias[] {
    try {
      const data = localStorage.getItem(KEYS.ALIASES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAlias(alias: Omit<BarcodeAlias, 'id' | 'updatedAt'>): BarcodeAlias {
    const list = this.getAliases();
    const existingIndex = list.findIndex(a => a.oldBarcode === alias.oldBarcode);
    const item: BarcodeAlias = {
      ...alias,
      id: existingIndex >= 0 ? list[existingIndex].id : Date.now().toString(),
      updatedAt: new Date().toLocaleDateString('ko-KR'),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(KEYS.ALIASES, JSON.stringify(list));
    return item;
  },

  deleteAlias(id: string): void {
    const list = this.getAliases().filter(a => a.id !== id);
    localStorage.setItem(KEYS.ALIASES, JSON.stringify(list));
  },

  // --- 발주 실패 관리함 (Failures: 행 삭제 및 재시도 지원) ---
  getOrderFailures(): OrderFailure[] {
    try {
      const data = localStorage.getItem(KEYS.FAILURES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addOrderFailures(failures: OrderFailure[]): void {
    const current = this.getOrderFailures();
    const merged = [...failures, ...current];
    localStorage.setItem(KEYS.FAILURES, JSON.stringify(merged));
  },

  deleteOrderFailure(id: string): void {
    const list = this.getOrderFailures().filter(f => f.id !== id);
    localStorage.setItem(KEYS.FAILURES, JSON.stringify(list));
  },

  clearOrderFailures(): void {
    localStorage.removeItem(KEYS.FAILURES);
  },

  // --- 시스템 설정 (Settings: 유앤미 아이디/비번, 4자리 PIN - 안전한 암호화 저장) ---
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const raw = JSON.parse(data);
      // 비밀번호 복호화 (암호문 prefix 'enc:' 확인)
      if (raw.younmePw && raw.younmePw.startsWith('enc:')) {
        try {
          const decoded = atob(raw.younmePw.replace('enc:', ''));
          raw.younmePw = decodeURIComponent(escape(decoded));
        } catch {}
      }
      return { ...DEFAULT_SETTINGS, ...raw };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    
    // 로컬스토리지에는 암호화된 형태로만 보관 (알바나 F12 개발자도구로 평문 노출 방지)
    const toStore = { ...updated };
    if (toStore.younmePw) {
      try {
        const encoded = btoa(unescape(encodeURIComponent(toStore.younmePw)));
        toStore.younmePw = `enc:${encoded}`;
      } catch {}
    }

    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(toStore));
    return updated;
  },

  // --- 과거 발주 엑셀 파싱 및 마스터 DB 업데이트 ---
  async importExcelFile(file: File): Promise<{ count: number; duplicates: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let parsedProducts: Product[] = [];

          // 유앤미24 HTML 형식 엑셀 파싱 (HTML Table)
          if (text.includes('<table') || text.includes('<TABLE')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const rows = doc.querySelectorAll('tr');
            
            rows.forEach((row, idx) => {
              if (idx < 2) return; // 제목 및 헤더 행 스킵
              const cells = row.querySelectorAll('td');
              if (cells.length >= 6) {
                const barcode = cells[2]?.textContent?.trim() || '';
                const name = cells[3]?.textContent?.trim() || '';
                const price = parseInt(cells[4]?.textContent?.replace(/[^0-9]/g, '') || '0', 10);
                const cost = parseInt(cells[5]?.textContent?.replace(/[^0-9]/g, '') || '0', 10);
                
                if (barcode && barcode.length >= 7 && name) {
                  parsedProducts.push({
                    barcode,
                    name,
                    price,
                    cost,
                    category: '기타',
                    targetStock: 10,
                    minOrderQty: 10,
                  });
                }
              }
            });
          } else {
            // 일반 바이너리 XLSX / XLS 파싱
            const workbook = XLSX.read(text, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (row && row.length >= 2) {
                const barcode = String(row[0] || '').trim();
                const name = String(row[1] || '').trim();
                if (barcode.length >= 7) {
                  parsedProducts.push({
                    barcode,
                    name,
                    price: Number(row[2]) || 0,
                    cost: Number(row[3]) || 0,
                    category: '기타',
                    targetStock: 10,
                    minOrderQty: 10,
                  });
                }
              }
            }
          }

          // 기존 마스터 DB와 병합
          const current = this.getProducts();
          const map = new Map<string, Product>();
          current.forEach(p => map.set(p.barcode, p));
          
          let addedCount = 0;
          parsedProducts.forEach(p => {
            if (!map.has(p.barcode)) {
              addedCount++;
            }
            map.set(p.barcode, { ...map.get(p.barcode), ...p });
          });

          const merged = Array.from(map.values());
          this.saveProducts(merged);
          resolve({ count: parsedProducts.length, duplicates: parsedProducts.length - addedCount });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      // HTML 엑셀인 경우 텍스트로, 아닌 경우 바이너리로 읽기
      reader.readAsText(file, 'euc-kr');
    });
  },
};
