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

// 비용 항목 문자열 → 카테고리 변환
function parseCostCategory(value: string): ManHourCostCategory {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('설계') || normalized === 'design') return 'design'
  if (normalized.includes('판넬') || normalized === 'panel') return 'panel'
  if (normalized.includes('배선') || normalized === 'wiring') return 'wiring'
  if (normalized.includes('셋업') || normalized.includes('시운전') || normalized === 'setup') return 'setup'
  if (normalized.includes('기타') || normalized === 'other') return 'other'
  return 'wiring' // 기본값
}

// 구글 시트 URL을 CSV URL로 변환
export function convertToGoogleSheetCsvUrl(url: string): string {
  // 이미 CSV export URL인 경우
  if (url.includes('/pub?') && url.includes('output=csv')) {
    return url
  }

  // 일반 구글 시트 URL에서 ID 추출
  // 형식: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (match) {
    const sheetId = match[1]
    // gid 파라미터가 있으면 추출
    const gidMatch = url.match(/gid=(\d+)/)
    const gid = gidMatch ? gidMatch[1] : '0'
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  }

  // 변환 불가능한 경우 원본 반환
  return url
}

// 구글 시트에서 CSV 데이터 가져오기
export async function fetchGoogleSheetCsv(url: string): Promise<string> {
  const csvUrl = convertToGoogleSheetCsvUrl(url)

  const response = await fetch(csvUrl)
  if (!response.ok) {
    throw new Error(`구글 시트를 불러올 수 없습니다. (${response.status})`)
  }

  const text = await response.text()
  if (!text.trim()) {
    throw new Error('구글 시트가 비어있습니다.')
  }

  return text
}

// CSV 문자열 파싱 (쉼표, 따옴표 처리)
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

// 구글 시트 CSV 파싱하여 외부 인원 데이터로 변환
export function parseGoogleSheetCsv(csvText: string): ManHourCost {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('데이터가 없습니다. 헤더와 최소 1개의 데이터 행이 필요합니다.')
  }

  const externalWorkers: ExternalWorker[] = []

  // 헤더 파싱
  const headerRow = parseCsvLine(lines[0])

  // 컬럼 인덱스 찾기 (유연하게)
  const findIndex = (keywords: string[]) =>
    headerRow.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())))

  const companyIdx = findIndex(['업체', '소속', 'company'])
  const nameIdx = findIndex(['작업자', '이름', 'name'])
  const rankIdx = findIndex(['직급', 'rank'])
  const rateIdx = findIndex(['일당', '단가', 'rate'])
  const categoryIdx = findIndex(['비용항목', '항목', 'category'])

  // 월별 컬럼 인덱스
  const monthIndices: number[] = []
  for (let m = 1; m <= 12; m++) {
    const idx = headerRow.findIndex(h => h.trim() === `${m}월` || h.trim() === String(m))
    monthIndices.push(idx)
  }

  // 데이터 행 파싱
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i])
    if (row.length === 0) continue

    const personName = nameIdx >= 0 ? row[nameIdx]?.trim() : ''
    if (!personName) continue // 빈 행 건너뛰기

    const company = companyIdx >= 0 ? row[companyIdx]?.trim() || '' : ''
    const rank = rankIdx >= 0 ? row[rankIdx]?.trim() || '' : ''
    const dailyRate = rateIdx >= 0 ? Number(row[rateIdx]?.replace(/[,원]/g, '')) || 0 : 0
    const costCategory = categoryIdx >= 0 ? parseCostCategory(row[categoryIdx] || '') : 'wiring'

    // 월별 공수
    const monthlyManDays: number[] = monthIndices.map(idx =>
      idx >= 0 ? (Number(row[idx]?.replace(/[,]/g, '')) || 0) : 0
    )

    // 총 공수 계산
    const totalManDays = monthlyManDays.reduce((sum, md) => sum + md, 0)

    // 공수가 0인 작업자는 제외
    if (totalManDays === 0 && dailyRate === 0) continue

    externalWorkers.push({
      id: `ext_gs_${Date.now()}_${i}`,
      personName,
      company,
      rank,
      dailyRate,
      totalManDays,
      projectManDays: totalManDays,
      monthlyManDays,
      dailyManDaysPerMonth: [],
      costCategory
    })
  }

  if (externalWorkers.length === 0) {
    throw new Error('유효한 작업자 데이터가 없습니다. 시트 형식을 확인해주세요.')
  }

  return {
    internalWorkers: [],
    externalWorkers,
    importedAt: new Date().toISOString()
  }
}
