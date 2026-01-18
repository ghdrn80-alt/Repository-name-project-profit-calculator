// 프로젝트 기본 정보
export interface ProjectInfo {
  projectName: string
  clientName: string
  originalEstimate: number    // 원가 견적가 (원래 견적)
  contractAmount: number      // 계약금액 (네고 후)
  totalPersonnel: number      // 총 투입 인원
  estimatedManHours: number   // 예상 공수 (M/H)
}

// 전기 자재비 (PLC, 감지기, 차단기, 케이블 등)
export interface ElectricalMaterial {
  id: string
  category: string
  itemName: string
  quantity: number
  unitPrice: number
}

// 출장 경비
export interface TravelExpense {
  accommodationCost: number   // 숙박비
  mealCost: number           // 식비
  transportCost: number      // 교통비
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

// 전장설계비 (레거시 호환용)
export interface DesignCost {
  id: string
  personName: string
  hours: number
  hourlyRate: number
}

// 판넬 제작비 (레거시 호환용)
export interface PanelCostItem {
  id: string
  workType?: string
  personName?: string
  hours?: number
  hourlyRate?: number
}

// 기체 배선비 (레거시 호환용)
export interface WiringCost {
  id: string
  personName: string
  hours: number
  hourlyRate: number
}

// 시운전/셋업 비용 (레거시 호환용)
export interface SetupCost {
  id: string
  description: string
  hours: number
  hourlyRate: number
}

// 간접비 및 기타
export interface OverheadAndMargin {
  overheadRate: number       // 공통 관리비율 (%) - 임대료, 전기료, 사무실 운영비 분담
  warrantyReserveRate: number // 하자보수 예비비율 (%) - A/S 유보금 (보통 3~5%)
  marginRate: number         // 목표 마진율 (%)
}

// 견적 배분 (계약금액을 항목별로 배분, 단위: 원)
export interface BudgetAllocation {
  // 인건비 항목별 배분 (원)
  laborDesign: number         // 인건비 - 설계
  laborPanel: number          // 인건비 - 판넬
  laborWiring: number         // 인건비 - 배선
  laborSetup: number          // 인건비 - 셋업
  laborOther: number          // 인건비 - 기타
  // 기타 비용 배분 (원)
  electricalMaterial: number  // 전기 자재비 배분
  travelExpense: number       // 출장 경비 배분
  outsourcingCost: number     // 외주 가공비 배분
  deliveryCost: number        // 운반/포장비 배분
  consumableCost: number      // 소모품비 배분
  overhead: number            // 간접비 배분
}

// 공수 비용 항목 카테고리
export type ManHourCostCategory =
  | 'design'      // 전장설계비
  | 'panel'       // 판넬 제작비
  | 'wiring'      // 기체 배선비
  | 'setup'       // 시운전/셋업
  | 'other'       // 기타 (별도 집계)

// 직원 마스터 데이터
export interface EmployeeMaster {
  id: string
  personName: string        // 이름
  rank: string              // 직급
  monthlySalary: number     // 월급여
  workingDaysPerMonth: number  // 월 근무일수 (기본 22)
  overheadRate: number      // 간접비율 (%, 기본 15)
  hoursPerDay: number       // 1일 기준 시간 (기본 8)
}

// 일별 공수 데이터 (월별로 31일치 배열)
export type DailyManDays = number[]  // 인덱스 0 = 1일, 최대 31개

// 내부 인원 데이터 (월급여 기반 계산)
export interface InternalWorker {
  id: string
  personName: string        // 작업자 이름
  rank: string              // 직급
  monthlySalary: number     // 월급여
  workingDaysPerMonth: number  // 월 근무일수 (기본 22일)
  overheadRate: number      // 간접비율 (%, 기본 15%)
  hoursPerDay: number       // 1일 기준 시간 (기본 8시간)
  projectHours: number      // 이 프로젝트 투입 시간
  costCategory: ManHourCostCategory  // 비용 항목
  employeeId?: string       // 마스터 직원 ID (선택된 경우)
  manualDailyRate?: number  // 직접 입력 일당 (직접입력 모드용)
}

// 외부 인원 (외주) 데이터 - 공수표용 (엑셀 임포트용)
export interface ExternalWorker {
  id: string
  personName: string        // 작업자 이름
  company: string           // 소속 (외주업체명)
  rank: string              // 직급
  dailyRate: number         // 일당 단가 (직접 입력)
  totalManDays: number      // 총 공수 (M/D) - 전체 (참고용)
  projectManDays: number    // 이 프로젝트 공수 - 비용 계산용
  monthlyManDays: number[]  // 월별 공수 합계 (1~12월)
  dailyManDaysPerMonth: DailyManDays[]  // 월별 일별 공수 (12개월 x 31일)
  costCategory: ManHourCostCategory  // 비용 항목
}

// 공수표 작업자 데이터 (기존 호환용 - deprecated)
export interface ManHourWorker extends ExternalWorker {}

// 공수 인건비 데이터
export interface ManHourCost {
  internalWorkers: InternalWorker[]  // 내부 인원
  externalWorkers: ExternalWorker[]  // 외부 인원 (외주)
  workers?: ManHourWorker[]  // 기존 호환용 (deprecated)
  sourceFile?: string       // 임포트한 파일 경로
  importedAt?: string       // 임포트 일시
}

// 전체 프로젝트 데이터
export interface ProjectData {
  projectInfo: ProjectInfo
  electricalMaterials: ElectricalMaterial[]
  travelExpense: TravelExpense
  outsourcingCosts: OutsourcingCost[]
  deliveryCost: DeliveryCost
  consumableCosts: ConsumableCost[]
  overheadAndMargin: OverheadAndMargin
  budgetAllocation: BudgetAllocation
  manHourCost: ManHourCost  // 인건비 (공수 통합)
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
  // 견적 비교
  originalEstimate: number       // 원가 견적가
  totalRevenue: number           // 계약금액 (매출)
  // 직접비
  laborCostTotal: number           // 인건비 총액 (내부 + 외부)
  laborCostByCategory: Record<ManHourCostCategory, number>  // 항목별 인건비
  electricalMaterialTotal: number
  travelExpenseTotal: number
  outsourcingCostTotal: number
  deliveryCostTotal: number
  consumableCostTotal: number
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
