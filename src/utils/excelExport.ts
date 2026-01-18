import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { ProjectData, ProfitSummary } from '../types'
import {
  calculateInternalDailyRate,
  calculateInternalWorkerCost,
  calculateExternalWorkerCost,
  calculateInternalTotal,
  calculateExternalTotal,
  calculateInternalManDaysFromHours
} from './manHourImport'

const thinBorder: Partial<ExcelJS.Borders> = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
const thickBorder: Partial<ExcelJS.Borders> = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }

type Style = { bold?: boolean; size?: number; color?: string; fill?: string; numFmt?: string; align?: 'left' | 'center' | 'right' }

function style(cell: ExcelJS.Cell, s: Style, border = thinBorder) {
  cell.font = { bold: s.bold, size: s.size ?? 10, color: s.color ? { argb: s.color } : undefined }
  if (s.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.fill } }
  cell.border = border
  cell.alignment = { horizontal: s.align ?? 'center', vertical: 'middle' }
  if (s.numFmt) cell.numFmt = s.numFmt
}

function sectionHeader(ws: ExcelJS.Worksheet, row: number, text: string) {
  ws.mergeCells(row, 1, row, 8)
  const c = ws.getCell(row, 1); c.value = text
  style(c, { bold: true, size: 12, color: 'FFFFFF', fill: '1F4E79' })
}

function tableHeader(ws: ExcelJS.Worksheet, row: number) {
  ['No', '구분', '항목', '수량/시수', '단가/시급', '금액(원)', '비고', '비율'].forEach((h, i) => {
    const c = ws.getCell(row, i + 1); c.value = h
    style(c, { bold: true, size: 10, color: 'FFFFFF', fill: '2E75B6' })
  })
  ws.getRow(row).height = 22
}

// 공수 테이블 헤더 (내부 인원용) - 8개 열로 통일
function manHourInternalHeader(ws: ExcelJS.Worksheet, row: number) {
  ['No', '구분', '이름', '월급여', '일당', '투입시간', 'M/D', '금액(원)'].forEach((h, i) => {
    const c = ws.getCell(row, i + 1); c.value = h
    style(c, { bold: true, size: 10, color: 'FFFFFF', fill: '059669' })
  })
  ws.getRow(row).height = 22
}

// 공수 테이블 헤더 (외부 인원용)
function manHourExternalHeader(ws: ExcelJS.Worksheet, row: number) {
  ['No', '구분', '업체명', '작업자', '일당', '총공수', '프로젝트공수', '금액(원)'].forEach((h, i) => {
    const c = ws.getCell(row, i + 1); c.value = h
    style(c, { bold: true, size: 10, color: 'FFFFFF', fill: '2563EB' })
  })
  ws.getRow(row).height = 22
}

interface CostItem { col3: string; col4?: number; col5?: number; col6: number; col7?: string }

function costRows<T>(ws: ExcelJS.Worksheet, r: number, no: number, label: string, items: T[], map: (i: T) => CostItem): number {
  if (!items.length) {
    ws.getCell(r, 1).value = no; ws.getCell(r, 2).value = label; ws.getCell(r, 3).value = '-'; ws.getCell(r, 6).value = 0
    for (let c = 1; c <= 8; c++) style(ws.getCell(r, c), { size: 10 })
    return r + 1
  }
  const start = r
  items.forEach((item, idx) => {
    const m = map(item)
    ws.getCell(r, 1).value = idx === 0 ? no : ''; ws.getCell(r, 2).value = idx === 0 ? label : ''
    ws.getCell(r, 3).value = m.col3; ws.getCell(r, 4).value = m.col4 ?? '-'; ws.getCell(r, 5).value = m.col5 ?? '-'
    ws.getCell(r, 6).value = m.col6; ws.getCell(r, 7).value = m.col7 ?? ''; ws.getCell(r, 8).value = ''
    for (let c = 1; c <= 8; c++) style(ws.getCell(r, c), { size: 10, align: c <= 3 || c === 7 ? 'center' : 'right', numFmt: c >= 4 && c <= 6 ? '#,##0' : undefined })
    r++
  })
  if (items.length > 1) { ws.mergeCells(start, 1, r - 1, 1); ws.mergeCells(start, 2, r - 1, 2) }
  return r
}

function simpleRow(ws: ExcelJS.Worksheet, r: number, no: number, label: string, sub: string, amt: number) {
  ws.getCell(r, 1).value = no; ws.getCell(r, 2).value = label; ws.getCell(r, 3).value = sub
  ws.getCell(r, 4).value = '-'; ws.getCell(r, 5).value = '-'; ws.getCell(r, 6).value = amt
  ws.getCell(r, 7).value = ''; ws.getCell(r, 8).value = ''
  for (let c = 1; c <= 8; c++) style(ws.getCell(r, c), { size: 10, align: c <= 3 ? 'center' : 'right', numFmt: c === 6 ? '#,##0' : undefined })
}

function subtotalRow(ws: ExcelJS.Worksheet, r: number, label: string, val: number, rate: number, fill: string, border = thinBorder) {
  ws.mergeCells(r, 1, r, 5)
  style(ws.getCell(r, 1), { bold: true, size: 10, fill }, border); ws.getCell(r, 1).value = label
  style(ws.getCell(r, 6), { bold: true, size: 10, fill, align: 'right', numFmt: '#,##0' }, border); ws.getCell(r, 6).value = val
  style(ws.getCell(r, 7), { fill }, border)
  style(ws.getCell(r, 8), { bold: true, size: 10, fill, align: 'right', numFmt: '0.0%' }, border); ws.getCell(r, 8).value = rate
  ws.getRow(r).height = 22
}

// 비용 항목 한글명
const COST_CATEGORY_LABELS: Record<string, string> = {
  design: '전장설계비',
  panel: '판넬제작비',
  wiring: '기체배선비',
  setup: '시운전/셋업',
  other: '기타'
}

export async function exportToExcel(data: ProjectData, summary: ProfitSummary) {
  const wb = new ExcelJS.Workbook(); wb.creator = '프로젝트 손익계산기'; wb.created = new Date()
  const ws = wb.addWorksheet('프로젝트 손익계산서', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true } })
  ws.columns = [{ width: 4 }, { width: 18 }, { width: 15 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 12 }]

  let r = 1
  ws.mergeCells(r, 1, r, 8)
  const t = ws.getCell(r, 1); t.value = '프 로 젝 트   손 익 계 산 서'
  t.font = { bold: true, size: 18 }; t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 30; r += 2

  sectionHeader(ws, r++, '■ 프로젝트 개요')
  const info: [string, string | number, string, string | number][] = [
    ['프로젝트명', data.projectInfo.projectName || '-', '고객사', data.projectInfo.clientName || '-'],
    ['계약금액', summary.totalRevenue, '작성일', new Date().toLocaleDateString('ko-KR')],
    ['투입인원', `${data.projectInfo.totalPersonnel}명`, '예상공수', `${data.projectInfo.estimatedManHours} M/H`],
  ]
  info.forEach(row => {
    ws.mergeCells(r, 1, r, 2); ws.mergeCells(r, 3, r, 4); ws.mergeCells(r, 5, r, 6); ws.mergeCells(r, 7, r, 8)
    style(ws.getCell(r, 1), { bold: true, size: 10, fill: 'D6DCE4' }); ws.getCell(r, 1).value = row[0]
    style(ws.getCell(r, 3), { size: 10, numFmt: typeof row[1] === 'number' ? '#,##0"원"' : undefined }); ws.getCell(r, 3).value = row[1]
    style(ws.getCell(r, 5), { bold: true, size: 10, fill: 'D6DCE4' }); ws.getCell(r, 5).value = row[2]
    style(ws.getCell(r, 7), { size: 10 }); ws.getCell(r, 7).value = row[3]
    ws.getRow(r).height = 22; r++
  })
  r++

  // 공수 인건비 (내부 + 외부 합계) - 먼저 계산
  const internalWorkers = data.manHourCost?.internalWorkers || []
  const externalWorkers = data.manHourCost?.externalWorkers || data.manHourCost?.workers || []
  const manHourData = { internalWorkers, externalWorkers }
  const internalTotal = calculateInternalTotal(manHourData)
  const externalTotal = calculateExternalTotal(manHourData)
  const manHourTotal = internalTotal + externalTotal

  sectionHeader(ws, r++, '■ 비용 명세'); tableHeader(ws, r++); let no = 1

  // 공수 인건비에서 카테고리별 비용 계산
  const designCostTotal = (internalWorkers.filter(w => w.costCategory === 'design').reduce((s, w) => s + calculateInternalWorkerCost(w), 0)) +
    (externalWorkers.filter(w => w.costCategory === 'design').reduce((s, w) => s + calculateExternalWorkerCost(w), 0))
  const panelCostTotal = (internalWorkers.filter(w => w.costCategory === 'panel').reduce((s, w) => s + calculateInternalWorkerCost(w), 0)) +
    (externalWorkers.filter(w => w.costCategory === 'panel').reduce((s, w) => s + calculateExternalWorkerCost(w), 0))
  const wiringCostTotal = (internalWorkers.filter(w => w.costCategory === 'wiring').reduce((s, w) => s + calculateInternalWorkerCost(w), 0)) +
    (externalWorkers.filter(w => w.costCategory === 'wiring').reduce((s, w) => s + calculateExternalWorkerCost(w), 0))
  const setupCostTotal = (internalWorkers.filter(w => w.costCategory === 'setup').reduce((s, w) => s + calculateInternalWorkerCost(w), 0)) +
    (externalWorkers.filter(w => w.costCategory === 'setup').reduce((s, w) => s + calculateExternalWorkerCost(w), 0))
  const otherCostTotal = (internalWorkers.filter(w => w.costCategory === 'other').reduce((s, w) => s + calculateInternalWorkerCost(w), 0)) +
    (externalWorkers.filter(w => w.costCategory === 'other').reduce((s, w) => s + calculateExternalWorkerCost(w), 0))

  simpleRow(ws, r++, no++, '전장설계비', '공수 인건비', designCostTotal)
  r = costRows(ws, r, no++, '전기자재비', data.electricalMaterials, (i: typeof data.electricalMaterials[0]) => ({ col3: i.itemName || '-', col4: i.quantity, col5: i.unitPrice, col6: i.quantity * i.unitPrice, col7: i.category }))
  simpleRow(ws, r++, no++, '판넬제작비', '공수 인건비', panelCostTotal)
  simpleRow(ws, r++, no++, '기체배선비', '공수 인건비', wiringCostTotal)
  simpleRow(ws, r++, no++, '출장경비', '숙박/식비/교통', summary.travelExpenseTotal)
  simpleRow(ws, r++, no++, '시운전/셋업', '공수 인건비', setupCostTotal)
  if (otherCostTotal > 0) {
    simpleRow(ws, r++, no++, '기타인건비', '공수 인건비', otherCostTotal)
  }
  r = costRows(ws, r, no++, '외주가공비', data.outsourcingCosts, (i: typeof data.outsourcingCosts[0]) => ({ col3: i.description || '-', col6: i.amount, col7: i.vendor }))
  simpleRow(ws, r++, no++, '운반/포장비', '운반+포장', summary.deliveryCostTotal)
  r = costRows(ws, r, no++, '소모품비', data.consumableCosts, (i: typeof data.consumableCosts[0]) => ({ col3: i.itemName || '-', col6: i.amount }))

  if (manHourTotal > 0) {
    simpleRow(ws, r++, no++, '공수인건비', `내부 ${internalTotal.toLocaleString()}원 + 외부 ${externalTotal.toLocaleString()}원`, manHourTotal)
  }

  subtotalRow(ws, r++, '직접비 소계', summary.directCostSubtotal, summary.totalRevenue > 0 ? summary.directCostSubtotal / summary.totalRevenue : 0, 'FFF2CC')

  simpleRow(ws, r++, no++, '공통관리비', `직접비 × ${data.overheadAndMargin.overheadRate}%`, summary.overheadCost)
  simpleRow(ws, r++, no++, '하자보수 예비비', `계약금액 × ${data.overheadAndMargin.warrantyReserveRate}%`, summary.warrantyReserveCost)
  subtotalRow(ws, r++, '간접비 소계', summary.indirectCostSubtotal, summary.totalRevenue > 0 ? summary.indirectCostSubtotal / summary.totalRevenue : 0, 'FFF2CC')
  subtotalRow(ws, r, '총 비용 (직접비 + 간접비)', summary.totalCost, summary.totalRevenue > 0 ? summary.totalCost / summary.totalRevenue : 0, 'BDD7EE', thickBorder)
  ws.getRow(r).height = 25; r += 2

  // 공수 인건비 상세 (내부 인원)
  if (internalWorkers.length > 0) {
    sectionHeader(ws, r++, '■ 공수 인건비 - 내부 인원 (월급여 기반)')
    manHourInternalHeader(ws, r++)

    internalWorkers.forEach((worker, idx) => {
      const dailyRate = calculateInternalDailyRate(worker)
      const manDays = calculateInternalManDaysFromHours(worker)
      const cost = calculateInternalWorkerCost(worker)
      const categoryLabel = COST_CATEGORY_LABELS[worker.costCategory || 'wiring'] || '기타'

      ws.getCell(r, 1).value = idx + 1
      ws.getCell(r, 2).value = categoryLabel
      ws.getCell(r, 3).value = worker.personName || '-'
      ws.getCell(r, 4).value = worker.monthlySalary
      ws.getCell(r, 5).value = dailyRate
      ws.getCell(r, 6).value = worker.projectHours || 0
      ws.getCell(r, 7).value = manDays
      ws.getCell(r, 8).value = cost

      for (let c = 1; c <= 8; c++) {
        style(ws.getCell(r, c), {
          size: 10,
          align: c <= 3 ? 'center' : 'right',
          numFmt: (c === 4 || c === 5 || c === 8) ? '#,##0' : (c === 7 ? '0.0' : undefined)
        })
      }
      r++
    })

    // 내부 인원 소계 - 8개 열
    ws.mergeCells(r, 1, r, 5)
    style(ws.getCell(r, 1), { bold: true, size: 10, fill: 'D1FAE5' }); ws.getCell(r, 1).value = '내부 인원 소계'
    const intTotalHours = internalWorkers.reduce((s, w) => s + (w.projectHours || 0), 0)
    const intManDays = internalWorkers.reduce((s, w) => s + calculateInternalManDaysFromHours(w), 0)
    style(ws.getCell(r, 6), { bold: true, size: 10, fill: 'D1FAE5', align: 'right' }); ws.getCell(r, 6).value = intTotalHours
    style(ws.getCell(r, 7), { bold: true, size: 10, fill: 'D1FAE5', align: 'right', numFmt: '0.0' }); ws.getCell(r, 7).value = intManDays
    style(ws.getCell(r, 8), { bold: true, size: 10, fill: 'D1FAE5', align: 'right', numFmt: '#,##0' }); ws.getCell(r, 8).value = internalTotal
    ws.getRow(r).height = 22
    r += 2
  }

  // 공수 인건비 상세 (외부 인원)
  if (externalWorkers.length > 0) {
    sectionHeader(ws, r++, '■ 공수 인건비 - 외부 인원 (공수표, 일당 기반)')
    manHourExternalHeader(ws, r++)

    externalWorkers.forEach((worker, idx) => {
      const cost = calculateExternalWorkerCost(worker)
      const categoryLabel = COST_CATEGORY_LABELS[worker.costCategory || 'wiring'] || '기타'

      ws.getCell(r, 1).value = idx + 1
      ws.getCell(r, 2).value = categoryLabel
      ws.getCell(r, 3).value = worker.company || '-'
      ws.getCell(r, 4).value = worker.personName || '-'
      ws.getCell(r, 5).value = worker.dailyRate
      ws.getCell(r, 6).value = worker.totalManDays
      ws.getCell(r, 7).value = worker.projectManDays ?? worker.totalManDays
      ws.getCell(r, 8).value = cost

      for (let c = 1; c <= 8; c++) {
        style(ws.getCell(r, c), {
          size: 10,
          align: c <= 4 ? 'center' : 'right',
          numFmt: c === 5 || c === 8 ? '#,##0' : (c === 6 || c === 7 ? '0.0' : undefined)
        })
      }
      r++
    })

    // 외부 인원 소계
    ws.mergeCells(r, 1, r, 5)
    style(ws.getCell(r, 1), { bold: true, size: 10, fill: 'DBEAFE' }); ws.getCell(r, 1).value = '외부 인원 소계'
    const extTotalManDays = externalWorkers.reduce((s, w) => s + w.totalManDays, 0)
    const extProjectManDays = externalWorkers.reduce((s, w) => s + (w.projectManDays ?? w.totalManDays), 0)
    style(ws.getCell(r, 6), { bold: true, size: 10, fill: 'DBEAFE', align: 'right', numFmt: '0.0' }); ws.getCell(r, 6).value = extTotalManDays
    style(ws.getCell(r, 7), { bold: true, size: 10, fill: 'DBEAFE', align: 'right', numFmt: '0.0' }); ws.getCell(r, 7).value = extProjectManDays
    style(ws.getCell(r, 8), { bold: true, size: 10, fill: 'DBEAFE', align: 'right', numFmt: '#,##0' }); ws.getCell(r, 8).value = externalTotal
    ws.getRow(r).height = 22
    r += 2
  }

  // 공수 인건비 총 합계 (내부 + 외부)
  if (manHourTotal > 0) {
    ws.mergeCells(r, 1, r, 6)
    style(ws.getCell(r, 1), { bold: true, size: 11, fill: '1E40AF', color: 'FFFFFF' }, thickBorder); ws.getCell(r, 1).value = '공수 인건비 총 합계'
    const intManDays = internalWorkers.reduce((s, w) => s + calculateInternalManDaysFromHours(w), 0)
    const extManDays = externalWorkers.reduce((s, w) => s + (w.projectManDays ?? w.totalManDays), 0)
    const totalManDays = intManDays + extManDays
    style(ws.getCell(r, 7), { bold: true, size: 11, fill: '1E40AF', color: 'FFFFFF', align: 'right', numFmt: '0.0' }, thickBorder); ws.getCell(r, 7).value = totalManDays
    style(ws.getCell(r, 8), { bold: true, size: 11, fill: '1E40AF', color: 'FFFFFF', align: 'right', numFmt: '#,##0' }, thickBorder); ws.getCell(r, 8).value = manHourTotal
    ws.getRow(r).height = 25
    r += 2
  }

  sectionHeader(ws, r++, '■ 손익 분석')
  const profit: [string, number, string][] = [
    ['계약금액 (A)', summary.totalRevenue, ''], ['총 비용 (B)', summary.totalCost, ''],
    ['순이익 (A-B)', summary.profit, summary.profit >= 0 ? '흑자' : '적자'],
    ['이익률', summary.profitRate, '%'], ['목표 마진율', summary.targetMargin, '%'],
    ['목표 대비', summary.marginDifference, summary.marginDifference >= 0 ? '달성' : '미달'],
  ]
  profit.forEach((row, idx) => {
    ws.mergeCells(r, 1, r, 3); ws.mergeCells(r, 4, r, 6); ws.mergeCells(r, 7, r, 8)
    style(ws.getCell(r, 1), { bold: true, size: 10, fill: 'D6DCE4' }); ws.getCell(r, 1).value = row[0]
    const v = ws.getCell(r, 4); const pct = row[2] === '%'
    style(v, { size: 10, align: 'right', numFmt: pct ? '0.0%' : '#,##0"원"' }); v.value = pct ? row[1] / 100 : row[1]
    if (idx === 2) { v.font = { bold: true, size: 11, color: { argb: summary.profit >= 0 ? '006400' : 'CC0000' } }; v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: summary.profit >= 0 ? 'C6EFCE' : 'FFC7CE' } } }
    const n = ws.getCell(r, 7)
    style(n, { size: 10, color: (row[2] === '달성' || row[2] === '흑자') ? '006400' : (row[2] === '미달' || row[2] === '적자') ? 'CC0000' : undefined })
    n.value = pct ? '' : row[2]; ws.getRow(r).height = 22; r++
  })
  r += 2

  sectionHeader(ws, r++, '■ 생산성 지표')
  const prod: [string, number, string][] = [['인당 매출액', summary.revenuePerPerson, '원/명'], ['인당 부가가치', summary.valueAddedPerPerson, '원/명'], ['공수 대비 효율', summary.efficiencyPerManHour, '원/M·H']]
  prod.forEach(row => {
    ws.mergeCells(r, 1, r, 3); ws.mergeCells(r, 4, r, 6); ws.mergeCells(r, 7, r, 8)
    style(ws.getCell(r, 1), { bold: true, size: 10, fill: 'D6DCE4' }); ws.getCell(r, 1).value = row[0]
    style(ws.getCell(r, 4), { size: 10, align: 'right', numFmt: '#,##0' }); ws.getCell(r, 4).value = row[1]
    style(ws.getCell(r, 7), { size: 10 }); ws.getCell(r, 7).value = row[2]; ws.getRow(r).height = 22; r++
  })
  r++

  // 견적 비교 분석 섹션 (금액 기반) - 8개 열로 통일
  const ba = data.budgetAllocation
  const budgetTotal = ba.laborDesign + ba.laborPanel + ba.laborWiring + ba.laborSetup + ba.laborOther +
    ba.electricalMaterial + ba.travelExpense + ba.outsourcingCost + ba.deliveryCost + ba.consumableCost + ba.overhead

  if (budgetTotal > 0) {
    sectionHeader(ws, r++, '■ 견적 비교 분석')

    // 헤더 - 8개 열 사용 (항목 2칸, 배분금액 2칸, 실제원가 2칸, 차이 1칸, 상태 1칸)
    ws.mergeCells(r, 1, r, 2)
    ws.mergeCells(r, 3, r, 4)
    ws.mergeCells(r, 5, r, 6)
    style(ws.getCell(r, 1), { bold: true, size: 10, color: 'FFFFFF', fill: '2E75B6' }); ws.getCell(r, 1).value = '항목'
    style(ws.getCell(r, 3), { bold: true, size: 10, color: 'FFFFFF', fill: '2E75B6' }); ws.getCell(r, 3).value = '배분금액'
    style(ws.getCell(r, 5), { bold: true, size: 10, color: 'FFFFFF', fill: '2E75B6' }); ws.getCell(r, 5).value = '실제원가'
    style(ws.getCell(r, 7), { bold: true, size: 10, color: 'FFFFFF', fill: '2E75B6' }); ws.getCell(r, 7).value = '차이'
    style(ws.getCell(r, 8), { bold: true, size: 10, color: 'FFFFFF', fill: '2E75B6' }); ws.getCell(r, 8).value = '상태'
    ws.getRow(r).height = 22
    r++

    // 비교 데이터: [항목명, 배분금액, 실제원가]
    const comparisons: [string, number, number][] = [
      ['인건비 - 설계', ba.laborDesign, designCostTotal],
      ['인건비 - 판넬', ba.laborPanel, panelCostTotal],
      ['인건비 - 배선', ba.laborWiring, wiringCostTotal],
      ['인건비 - 셋업', ba.laborSetup, setupCostTotal],
      ['인건비 - 기타', ba.laborOther, otherCostTotal],
      ['전기 자재비', ba.electricalMaterial, summary.electricalMaterialTotal],
      ['출장 경비', ba.travelExpense, summary.travelExpenseTotal],
      ['외주 가공비', ba.outsourcingCost, summary.outsourcingCostTotal],
      ['운반/포장비', ba.deliveryCost, summary.deliveryCostTotal],
      ['소모품비', ba.consumableCost, summary.consumableCostTotal],
      ['간접비', ba.overhead, summary.indirectCostSubtotal],
    ]

    comparisons.forEach(([label, budget, actual]) => {
      const diff = budget - actual
      const status = diff > 0 ? '절감' : diff < 0 ? '초과' : '일치'
      const statusColor = diff > 0 ? '006400' : diff < 0 ? 'CC0000' : '000000'
      const rowFill = diff > 0 ? 'C6EFCE' : diff < 0 ? 'FFC7CE' : 'FFFFFF'

      ws.mergeCells(r, 1, r, 2)
      ws.mergeCells(r, 3, r, 4)
      ws.mergeCells(r, 5, r, 6)

      ws.getCell(r, 1).value = label
      ws.getCell(r, 3).value = budget
      ws.getCell(r, 5).value = actual
      ws.getCell(r, 7).value = diff
      ws.getCell(r, 8).value = status

      style(ws.getCell(r, 1), { size: 10, fill: rowFill })
      style(ws.getCell(r, 3), { size: 10, align: 'right', numFmt: '#,##0', fill: rowFill })
      style(ws.getCell(r, 5), { size: 10, align: 'right', numFmt: '#,##0', fill: rowFill })
      style(ws.getCell(r, 7), { size: 10, align: 'right', numFmt: '+#,##0;-#,##0;0', fill: rowFill, color: statusColor })
      style(ws.getCell(r, 8), { size: 10, fill: rowFill, color: statusColor })
      r++
    })

    // 합계
    const totalActual = summary.totalCost
    const totalDiff = budgetTotal - totalActual
    const totalStatus = totalDiff >= 0 ? '예산 내' : '예산 초과'

    ws.mergeCells(r, 1, r, 2)
    ws.mergeCells(r, 3, r, 4)
    ws.mergeCells(r, 5, r, 6)

    ws.getCell(r, 1).value = '합계'
    ws.getCell(r, 3).value = budgetTotal
    ws.getCell(r, 5).value = totalActual
    ws.getCell(r, 7).value = totalDiff
    ws.getCell(r, 8).value = totalStatus

    style(ws.getCell(r, 1), { bold: true, size: 10, fill: 'BDD7EE' })
    style(ws.getCell(r, 3), { bold: true, size: 10, align: 'right', numFmt: '#,##0', fill: 'BDD7EE' })
    style(ws.getCell(r, 5), { bold: true, size: 10, align: 'right', numFmt: '#,##0', fill: 'BDD7EE' })
    style(ws.getCell(r, 7), { bold: true, size: 10, align: 'right', numFmt: '+#,##0;-#,##0;0', fill: 'BDD7EE', color: totalDiff >= 0 ? '006400' : 'CC0000' })
    style(ws.getCell(r, 8), { bold: true, size: 10, fill: 'BDD7EE', color: totalDiff >= 0 ? '006400' : 'CC0000' })
    ws.getRow(r).height = 22
  }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), data.projectInfo.projectName ? `${data.projectInfo.projectName}_손익계산서.xlsx` : '손익계산서.xlsx')
}
