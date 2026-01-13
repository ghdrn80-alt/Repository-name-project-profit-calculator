// 프로젝트 기본 정보
export interface ProjectInfo {
  projectName: string
  clientName: string
  contractAmount: number
  totalPersonnel: number      // 총 투입 인원
  estimatedManHours: number   // 예상 공수 (M/H)
}

// 전장설계비 (인건비/설계 시수)
export interface DesignCost {
  id: string
  personName: string
  hours: number
  hourlyRate: number
}

// 전기 자재비 (PLC, 감지기, 차단기, 케이블 등)
export interface ElectricalMaterial {
  id: string
  category: string
  itemName: string
  quantity: number
  unitPrice: number
}

// 판넬 제작비 (작업자별 시수 x 시급)
export interface PanelCostItem {
  id: string
  workType: string      // 작업 유형 (가공, 조립, 배선, 마킹, 검수 등)
  personName: string    // 작업자명
  hours: number         // 시수
  hourlyRate: number    // 시급
}

// 기체 배선 작업비 (현장 작업 시수)
export interface WiringCost {
  id: string
  personName: string
  hours: number
  hourlyRate: number
}

// 출장 경비
export interface TravelExpense {
  accommodationCost: number   // 숙박비
  mealCost: number           // 식비
  transportCost: number      // 교통비
}

// 시운전 및 셋업 비용
export interface SetupCost {
  id: string
  description: string
  hours: number
  hourlyRate: number
}

// 외주 가공비
export interface OutsourcingCost {
  id: string
  vendor: string
  description: string
  amount: number
}

// 운반비 및 포장비
export interface DeliveryCost {
  shippingCost: number       // 운반비
  packagingCost: number      // 포장비
}

// 소모품비 (테이프, 튜브, 명판 등)
export interface ConsumableCost {
  id: string
  itemName: string
  amount: number
}

// 간접비 및 기타
export interface OverheadAndMargin {
  overheadRate: number       // 공통 관리비율 (%) - 임대료, 전기료, 사무실 운영비 분담
  warrantyReserveRate: number // 하자보수 예비비율 (%) - A/S 유보금 (보통 3~5%)
  marginRate: number         // 목표 마진율 (%)
}

// 견적 배분 (계약금액을 항목별로 배분)
export interface BudgetAllocation {
  designCost: number          // 전장설계비 배분
  electricalMaterial: number  // 전기 자재비 배분
  panelCost: number           // 판넬 제작비 배분
  wiringCost: number          // 기체 배선비 배분
  travelExpense: number       // 출장 경비 배분
  setupCost: number           // 시운전/셋업 배분
  outsourcingCost: number     // 외주 가공비 배분
  deliveryCost: number        // 운반/포장비 배분
  consumableCost: number      // 소모품비 배분
  overhead: number            // 간접비 배분
  manHourCost: number         // 공수 인건비 배분
}

// 공수 비용 항목 카테고리
export type ManHourCostCategory =
  | 'design'      // 전장설계비
  | 'panel'       // 판넬 제작비
  | 'wiring'      // 기체 배선비
  | 'setup'       // 시운전/셋업
  | 'other'       // 기타 (별도 집계)

// 일별 공수 데이터 (월별로 31일치 배열)
export type DailyManDays = number[]  // 인덱스 0 = 1일, 최대 31개

// 공수표 작업자 데이터 (엑셀 임포트용)
export interface ManHourWorker {
  id: string
  personName: string        // 작업자 이름
  company: string           // 소속
  rank: string              // 직급
  dailyRate: number         // 일당 단가
  totalManDays: number      // 총 공수 (M/D)
  monthlyManDays: number[]  // 월별 공수 합계 (1~12월)
  dailyManDaysPerMonth: DailyManDays[]  // 월별 일별 공수 (12개월 x 31일)
  costCategory: ManHourCostCategory  // 비용 항목
}

// 공수 인건비 데이터
export interface ManHourCost {
  workers: ManHourWorker[]
  sourceFile?: string       // 임포트한 파일 경로
  importedAt?: string       // 임포트 일시
}

// 전체 프로젝트 데이터
export interface ProjectData {
  projectInfo: ProjectInfo
  designCosts: DesignCost[]
  electricalMaterials: ElectricalMaterial[]
  panelCosts: PanelCostItem[]
  wiringCosts: WiringCost[]
  travelExpense: TravelExpense
  setupCosts: SetupCost[]
  outsourcingCosts: OutsourcingCost[]
  deliveryCost: DeliveryCost
  consumableCosts: ConsumableCost[]
  overheadAndMargin: OverheadAndMargin
  budgetAllocation: BudgetAllocation
  manHourCost: ManHourCost  // 공수 인건비 추가
}

// 항목별 비교 데이터
export interface CostComparison {
  label: string
  budget: number      // 배분 금액
  actual: number      // 실제 원가
  difference: number  // 차이 (배분 - 실제, 양수면 절감)
  status: 'under' | 'over' | 'match'  // 예산 대비 상태
}

// 손익 요약
export interface ProfitSummary {
  totalRevenue: number
  // 직접비
  designCostTotal: number
  electricalMaterialTotal: number
  panelCostTotal: number
  wiringCostTotal: number
  travelExpenseTotal: number
  setupCostTotal: number
  outsourcingCostTotal: number
  deliveryCostTotal: number
  consumableCostTotal: number
  manHourCostTotal: number       // 공수 인건비 총액
  directCostSubtotal: number     // 직접비 소계
  // 간접비
  overheadCost: number           // 공통 관리비
  warrantyReserveCost: number    // 하자보수 예비비
  indirectCostSubtotal: number   // 간접비 소계
  // 합계 및 손익
  totalCost: number
  profit: number
  profitRate: number
  targetMargin: number
  marginDifference: number
  // 견적 비교
  budgetTotal: number            // 배분 합계
  unallocated: number            // 미배분 금액
  costComparisons: CostComparison[]  // 항목별 비교
  // 인당 생산성 지표
  totalPersonnel: number         // 총 투입 인원
  estimatedManHours: number      // 예상 공수 (M/H)
  revenuePerPerson: number       // 인당 매출액
  valueAddedPerPerson: number    // 인당 부가가치 (매출 - 직접비) / 인원
  efficiencyPerManHour: number   // 공수 대비 효율 (매출 / 공수)
}

// Electron API 타입
export interface SaveResult {
  success: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

export interface LoadResult {
  success: boolean
  canceled?: boolean
  data?: string
  filePath?: string
  error?: string
}

declare global {
  interface Window {
    electronAPI?: {
      saveProject: (data: string) => Promise<SaveResult>
      loadProject: () => Promise<LoadResult>
    }
  }
}
