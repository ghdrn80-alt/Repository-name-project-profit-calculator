import * as XLSX from 'xlsx'
import { ManHourCost, ManHourCostCategory, InternalWorker, ExternalWorker } from '../types'

export interface ImportResult {
  success: boolean
  data?: ManHourCost
  error?: string
}

// 내부 인원 일당 계산 (월급여 기반 또는 직접입력)
export function calculateInternalDailyRate(worker: InternalWorker): number {
  // 직접 입력 일당이 있으면 사용
  if (worker.manualDailyRate && worker.manualDailyRate > 0) {
    return worker.manualDailyRate
  }
  // 월급여 기반 계산
  if (worker.workingDaysPerMonth <= 0) return 0
  const baseDailyRate = worker.monthlySalary / worker.workingDaysPerMonth
  const overheadMultiplier = 1 + (worker.overheadRate / 100)
  return Math.round(baseDailyRate * overheadMultiplier)
}

// 내부 인원 시간 → M/D 변환
export function calculateInternalManDaysFromHours(worker: InternalWorker): number {
  const hoursPerDay = worker.hoursPerDay || 8
  if (hoursPerDay <= 0) return 0
  return worker.projectHours / hoursPerDay
}

// 내부 인원 비용 계산
export function calculateInternalWorkerCost(worker: InternalWorker): number {
  const dailyRate = calculateInternalDailyRate(worker)
  const manDays = calculateInternalManDaysFromHours(worker)
  return Math.round(dailyRate * manDays)
}

// 외부 인원 비용 계산 (직접 일당 적용)
export function calculateExternalWorkerCost(worker: ExternalWorker): number {
  return worker.dailyRate * (worker.projectManDays ?? worker.totalManDays)
}

// 공수표 엑셀 파일에서 외부 인원 데이터 파싱
export function parseManHourExcel(workbook: XLSX.WorkBook): ManHourCost {
  const externalWorkers: ExternalWorker[] = []

  // "작업자 목록" 시트에서 데이터 추출
  const workerListSheet = workbook.Sheets['작업자 목록']
  if (!workerListSheet) {
    throw new Error('작업자 목록 시트를 찾을 수 없습니다.')
  }

  const data = XLSX.utils.sheet_to_json<unknown[]>(workerListSheet, { header: 1, defval: '' })

  // 헤더 행 찾기 (작업자 이름, 소속, 성별... 가 있는 행)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i] as string[]
    if (row && row.some(cell => cell === '작업자 이름')) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('헤더 행을 찾을 수 없습니다.')
  }

  // 헤더에서 컬럼 인덱스 찾기
  const headerRow = data[headerRowIndex] as string[]
  const nameIdx = headerRow.findIndex(h => h === '작업자 이름')
  const companyIdx = headerRow.findIndex(h => h === '소속')
  const rankIdx = headerRow.findIndex(h => h === '직급')
  const rateIdx = headerRow.findIndex(h => h === '단가')

  // 월별 공수 컬럼 인덱스 (1월~12월)
  const monthIndices: number[] = []
  for (let m = 1; m <= 12; m++) {
    const idx = headerRow.findIndex(h => h === `${m}월`)
    monthIndices.push(idx)
  }

  const totalIdx = headerRow.findIndex(h => h === '합계')

  // 데이터 행 파싱 (헤더 다음 행부터)
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as (string | number)[]
    if (!row) continue

    const personName = String(row[nameIdx] || '').trim()
    if (!personName) continue // 빈 행 건너뛰기

    const company = String(row[companyIdx] || '').trim()
    const rank = String(row[rankIdx] || '').trim()
    const dailyRate = Number(row[rateIdx]) || 0

    // 월별 공수
    const monthlyManDays: number[] = monthIndices.map(idx =>
      idx >= 0 ? (Number(row[idx]) || 0) : 0
    )

    // 총 공수
    const totalManDays = totalIdx >= 0
      ? (Number(row[totalIdx]) || 0)
      : monthlyManDays.reduce((sum, md) => sum + md, 0)

    // 공수가 0인 작업자는 제외
    if (totalManDays === 0) continue

    externalWorkers.push({
      id: `ext_${Date.now()}_${i}`,
      personName,
      company,
      rank,
      dailyRate,
      totalManDays,
      projectManDays: totalManDays,  // 기본값: 총 공수와 동일
      monthlyManDays,
      dailyManDaysPerMonth: [],
      costCategory: 'wiring'  // 기본값: 기체 배선비
    })
  }

  return {
    internalWorkers: [],
    externalWorkers,
    importedAt: new Date().toISOString()
  }
}

// 파일 읽기 (브라우저용)
export function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        resolve(workbook)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}

// 내부 인원 총 인건비 계산
export function calculateInternalTotal(manHourCost: ManHourCost): number {
  return (manHourCost.internalWorkers || []).reduce(
    (sum, worker) => sum + calculateInternalWorkerCost(worker),
    0
  )
}

// 외부 인원 총 인건비 계산
export function calculateExternalTotal(manHourCost: ManHourCost): number {
  return (manHourCost.externalWorkers || []).reduce(
    (sum, worker) => sum + calculateExternalWorkerCost(worker),
    0
  )
}

// 공수 인건비 총액 계산 (내부 + 외부)
export function calculateManHourTotal(manHourCost: ManHourCost): number {
  return calculateInternalTotal(manHourCost) + calculateExternalTotal(manHourCost)
}

// 월별 인건비 계산 (외부 인원만 - 월별 데이터가 있는 경우)
export function calculateMonthlyLaborCost(manHourCost: ManHourCost, month: number): number {
  if (month < 1 || month > 12) return 0
  return (manHourCost.externalWorkers || []).reduce(
    (sum, worker) => sum + ((worker.monthlyManDays?.[month - 1] || 0) * worker.dailyRate),
    0
  )
}

// 비용 항목별 공수 인건비 계산
export function calculateManHourByCategory(manHourCost: ManHourCost, category: ManHourCostCategory): number {
  // 내부 인원
  const internalCost = (manHourCost.internalWorkers || [])
    .filter(worker => (worker.costCategory || 'wiring') === category)
    .reduce((sum, worker) => sum + calculateInternalWorkerCost(worker), 0)

  // 외부 인원
  const externalCost = (manHourCost.externalWorkers || [])
    .filter(worker => (worker.costCategory || 'wiring') === category)
    .reduce((sum, worker) => sum + calculateExternalWorkerCost(worker), 0)

  return internalCost + externalCost
}

// 전체 비용 항목별 공수 인건비 계산 (한번에)
export function calculateAllManHourByCategory(manHourCost: ManHourCost): Record<ManHourCostCategory, number> {
  const result: Record<ManHourCostCategory, number> = {
    design: 0,
    panel: 0,
    wiring: 0,
    setup: 0,
    other: 0
  }

  // 내부 인원
  for (const worker of (manHourCost.internalWorkers || [])) {
    const category = worker.costCategory || 'wiring'
    result[category] += calculateInternalWorkerCost(worker)
  }

  // 외부 인원
  for (const worker of (manHourCost.externalWorkers || [])) {
    const category = worker.costCategory || 'wiring'
    result[category] += calculateExternalWorkerCost(worker)
  }

  return result
}

// 내부 인원 총 공수 계산 (시간 → M/D 변환)
export function calculateInternalManDays(manHourCost: ManHourCost): number {
  return (manHourCost.internalWorkers || []).reduce(
    (sum, worker) => sum + calculateInternalManDaysFromHours(worker),
    0
  )
}

// 내부 인원 총 시간 계산
export function calculateInternalTotalHours(manHourCost: ManHourCost): number {
  return (manHourCost.internalWorkers || []).reduce(
    (sum, worker) => sum + (worker.projectHours || 0),
    0
  )
}

// 외부 인원 총 공수 계산
export function calculateExternalManDays(manHourCost: ManHourCost): number {
  return (manHourCost.externalWorkers || []).reduce(
    (sum, worker) => sum + (worker.projectManDays ?? worker.totalManDays),
    0
  )
}
