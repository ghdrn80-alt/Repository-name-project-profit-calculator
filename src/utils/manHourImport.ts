import * as XLSX from 'xlsx'
import { ManHourWorker, ManHourCost, ManHourCostCategory } from '../types'

export interface ImportResult {
  success: boolean
  data?: ManHourCost
  error?: string
}

// 공수표 엑셀 파일에서 작업자 데이터 파싱
export function parseManHourExcel(workbook: XLSX.WorkBook): ManHourCost {
  const workers: ManHourWorker[] = []

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

    workers.push({
      id: `mh_${Date.now()}_${i}`,
      personName,
      company,
      rank,
      dailyRate,
      totalManDays,
      monthlyManDays,
      costCategory: 'wiring'  // 기본값: 기체 배선비
    })
  }

  return {
    workers,
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

// 공수 인건비 총액 계산
export function calculateManHourTotal(manHourCost: ManHourCost): number {
  return manHourCost.workers.reduce(
    (sum, worker) => sum + (worker.totalManDays * worker.dailyRate),
    0
  )
}

// 월별 인건비 계산
export function calculateMonthlyLaborCost(manHourCost: ManHourCost, month: number): number {
  if (month < 1 || month > 12) return 0
  return manHourCost.workers.reduce(
    (sum, worker) => sum + (worker.monthlyManDays[month - 1] * worker.dailyRate),
    0
  )
}

// 비용 항목별 공수 인건비 계산
export function calculateManHourByCategory(manHourCost: ManHourCost, category: ManHourCostCategory): number {
  return manHourCost.workers
    .filter(worker => (worker.costCategory || 'wiring') === category)
    .reduce((sum, worker) => sum + (worker.totalManDays * worker.dailyRate), 0)
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

  for (const worker of manHourCost.workers) {
    const category = worker.costCategory || 'wiring'
    result[category] += worker.totalManDays * worker.dailyRate
  }

  return result
}
