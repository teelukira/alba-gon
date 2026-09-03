export interface Product {
  barcode: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  targetStock: number;  // 기본 목표 진열수량 (안전재고)
  minOrderQty: number;  // 최소 발주수량 (MOQ)
  photoUrl?: string;    // 미등록 시 찍은 사진
  isNewProduct?: boolean;
}

export interface AuditItem {
  id: string;
  barcode: string;
  productName: string;
  stockCount: number;
  targetStock: number;
  minOrderQty: number;
  photoUrl?: string;
  isUnmapped?: boolean;
  workerName: string;
  updatedAt: string;
}

export interface BarcodeAlias {
  id: string;
  oldBarcode: string;      // 알바가 실물로 찍는 구형 바코드
  newBarcode: string;      // 유앤미24 주문용 신규 바코드
  productName: string;
  note?: string;
  updatedAt: string;
}

export interface OrderItem {
  barcode: string;
  productName: string;
  currentStock: number;
  targetStock: number;
  recommendedQty: number;
  finalOrderQty: number;
  minOrderQty: number;
  isBelowMinQty: boolean;
  usingAliasBarcode?: string; // 대체 바코드로 변경된 경우
  category?: string;          // 저온/상온 여부
  status: 'PENDING' | 'ORDERED' | 'FAILED';
  failReason?: string;
}

export interface OrderFailure {
  id: string;
  barcode: string;
  productName: string;
  failReason: 'OUT_OF_STOCK' | 'BELOW_MIN_QTY' | 'DISCONTINUED' | 'NOT_FOUND' | 'OTHER';
  failDetail: string;
  attemptedQty: number;
  minOrderQty: number;
  failedAt: string;
}

export interface AppSettings {
  managerPin: string;         // 사장님 4자리 PIN (기본: 1234)
  younmeId: string;           // 유앤미24 아이디
  younmePw: string;           // 유앤미24 비밀번호
  workerName: string;         // 공용폰 알바 기본 이름
  autoOrderEnabled: boolean;
}
