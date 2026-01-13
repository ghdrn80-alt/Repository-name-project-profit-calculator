import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { ProjectData, ProfitSummary } from '../types'

// 테두리 스타일
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

const thickBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'medium' },
  left: { style: 'medium' },
  bottom: { style: 'medium' },
  right: { style: 'medium' },
}

export async function exportToExcel(data: ProjectData, summary: ProfitSummary) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '프로젝트 손익계산기'
  workbook.created = new Date()

  const ws = workbook.addWorksheet('프로젝트 손익계산서', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true }
  })

  // 열 너비 설정 (A~H)
  ws.columns = [
    { width: 4 },   // A: No
    { width: 18 },  // B: 항목
    { width: 15 },  // C: 세부항목
    { width: 12 },  // D: 수량/시수
    { width: 14 },  // E: 단가/시급
    { width: 16 },  // F: 금액
    { width: 14 },  // G: 비고
    { width: 12 },  // H: 비율
  ]

  let row = 1

  // ========== 문서 헤더 ==========
  // 제목
  ws.mergeCells(row, 1, row, 8)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = '프 로 젝 트   손 익 계 산 서'
  titleCell.font = { bold: true, size: 18 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(row).height = 30
  row += 2

  // 프로젝트 정보 헤더
  ws.mergeCells(row, 1, row, 8)
  const infoHeader = ws.getCell(row, 1)
  infoHeader.value = '■ 프로젝트 개요'
  infoHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } }
  infoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } }
  row++

  // 프로젝트 정보 테이블
  const projectInfoRows = [
    ['프로젝트명', data.projectInfo.projectName || '-', '고객사', data.projectInfo.clientName || '-'],
    ['계약금액', summary.totalRevenue, '작성일', new Date().toLocaleDateString('ko-KR')],
    ['투입인원', `${data.projectInfo.totalPersonnel}명`, '예상공수', `${data.projectInfo.estimatedManHours} M/H`],
  ]

  projectInfoRows.forEach(rowData => {
    // 라벨1
    ws.mergeCells(row, 1, row, 2)
    const label1 = ws.getCell(row, 1)
    label1.value = rowData[0] as string
    label1.font = { bold: true, size: 10 }
    label1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6DCE4' } }
    label1.border = thinBorder
    label1.alignment = { horizontal: 'center', vertical: 'middle' }

    // 값1
    ws.mergeCells(row, 3, row, 4)
    const val1 = ws.getCell(row, 3)
    val1.value = rowData[1]
    val1.font = { size: 10 }
    val1.border = thinBorder
    val1.alignment = { horizontal: 'center', vertical: 'middle' }
    if (typeof rowData[1] === 'number') val1.numFmt = '#,##0"원"'

    // 라벨2
    ws.mergeCells(row, 5, row, 6)
    const label2 = ws.getCell(row, 5)
    label2.value = rowData[2] as string
    label2.font = { bold: true, size: 10 }
    label2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6DCE4' } }
    label2.border = thinBorder
    label2.alignment = { horizontal: 'center', vertical: 'middle' }

    // 값2
    ws.mergeCells(row, 7, row, 8)
    const val2 = ws.getCell(row, 7)
    val2.value = rowData[3]
    val2.font = { size: 10 }
    val2.border = thinBorder
    val2.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getRow(row).height = 22
    row++
  })

  row++

  // ========== 비용 명세 ==========
  ws.mergeCells(row, 1, row, 8)
  const costHeader = ws.getCell(row, 1)
  costHeader.value = '■ 비용 명세'
  costHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } }
  costHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } }
  row++

  // 테이블 헤더
  const headers = ['No', '구분', '항목', '수량/시수', '단가/시급', '금액(원)', '비고', '비율']
  headers.forEach((h, idx) => {
    const cell = ws.getCell(row, idx + 1)
    cell.value = h
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } }
    cell.border = thinBorder
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ws.getRow(row).height = 22
  row++

  let itemNo = 1

  // 직접비 섹션 시작 행 저장
  const directCostStartRow = row

  // 직접비 - 전장설계비
  const designMergeStart = row
  if (data.designCosts.length > 0) {
    data.designCosts.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '전장설계비' : ''
      ws.getCell(row, 3).value = item.personName || '-'
      ws.getCell(row, 4).value = item.hours
      ws.getCell(row, 5).value = item.hourlyRate
      ws.getCell(row, 6).value = item.hours * item.hourlyRate
      ws.getCell(row, 7).value = ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
        if (c >= 4 && c <= 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.designCosts.length > 1) {
      ws.mergeCells(designMergeStart, 1, row - 1, 1)
      ws.mergeCells(designMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '전장설계비'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }
  itemNo++

  // 직접비 - 전기자재비
  const matMergeStart = row
  if (data.electricalMaterials.length > 0) {
    data.electricalMaterials.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '전기자재비' : ''
      ws.getCell(row, 3).value = item.itemName || '-'
      ws.getCell(row, 4).value = item.quantity
      ws.getCell(row, 5).value = item.unitPrice
      ws.getCell(row, 6).value = item.quantity * item.unitPrice
      ws.getCell(row, 7).value = item.category || ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 || c === 7 ? 'center' : 'right', vertical: 'middle' }
        if (c >= 4 && c <= 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.electricalMaterials.length > 1) {
      ws.mergeCells(matMergeStart, 1, row - 1, 1)
      ws.mergeCells(matMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '전기자재비'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }
  itemNo++

  // 직접비 - 판넬제작비
  const panelMergeStart = row
  if (data.panelCosts.length > 0) {
    data.panelCosts.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '판넬제작비' : ''
      ws.getCell(row, 3).value = item.personName || '-'
      ws.getCell(row, 4).value = item.hours ?? 0
      ws.getCell(row, 5).value = item.hourlyRate ?? 0
      ws.getCell(row, 6).value = (item.hours ?? 0) * (item.hourlyRate ?? 0)
      ws.getCell(row, 7).value = item.workType || ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 || c === 7 ? 'center' : 'right', vertical: 'middle' }
        if (c >= 4 && c <= 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.panelCosts.length > 1) {
      ws.mergeCells(panelMergeStart, 1, row - 1, 1)
      ws.mergeCells(panelMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '판넬제작비'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }
  itemNo++

  // 직접비 - 기체배선비
  const wiringMergeStart = row
  if (data.wiringCosts.length > 0) {
    data.wiringCosts.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '기체배선비' : ''
      ws.getCell(row, 3).value = item.personName || '-'
      ws.getCell(row, 4).value = item.hours
      ws.getCell(row, 5).value = item.hourlyRate
      ws.getCell(row, 6).value = item.hours * item.hourlyRate
      ws.getCell(row, 7).value = ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
        if (c >= 4 && c <= 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.wiringCosts.length > 1) {
      ws.mergeCells(wiringMergeStart, 1, row - 1, 1)
      ws.mergeCells(wiringMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '기체배선비'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }
  itemNo++

  // 직접비 - 출장경비
  ws.getCell(row, 1).value = itemNo
  ws.getCell(row, 2).value = '출장경비'
  ws.getCell(row, 3).value = '숙박/식비/교통'
  ws.getCell(row, 4).value = '-'
  ws.getCell(row, 5).value = '-'
  ws.getCell(row, 6).value = summary.travelExpenseTotal
  ws.getCell(row, 7).value = ''
  ws.getCell(row, 8).value = ''
  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(row, c)
    cell.border = thinBorder
    cell.font = { size: 10 }
    cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
    if (c === 6) cell.numFmt = '#,##0'
  }
  row++
  itemNo++

  // 직접비 - 시운전/셋업
  const setupMergeStart = row
  if (data.setupCosts.length > 0) {
    data.setupCosts.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '시운전/셋업' : ''
      ws.getCell(row, 3).value = item.description || '-'
      ws.getCell(row, 4).value = item.hours
      ws.getCell(row, 5).value = item.hourlyRate
      ws.getCell(row, 6).value = item.hours * item.hourlyRate
      ws.getCell(row, 7).value = ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
        if (c >= 4 && c <= 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.setupCosts.length > 1) {
      ws.mergeCells(setupMergeStart, 1, row - 1, 1)
      ws.mergeCells(setupMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '시운전/셋업'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }
  itemNo++

  // 직접비 - 외주가공비
  const outsourceMergeStart = row
  if (data.outsourcingCosts.length > 0) {
    data.outsourcingCosts.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '외주가공비' : ''
      ws.getCell(row, 3).value = item.description || '-'
      ws.getCell(row, 4).value = '-'
      ws.getCell(row, 5).value = '-'
      ws.getCell(row, 6).value = item.amount
      ws.getCell(row, 7).value = item.vendor || ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 || c === 7 ? 'center' : 'right', vertical: 'middle' }
        if (c === 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.outsourcingCosts.length > 1) {
      ws.mergeCells(outsourceMergeStart, 1, row - 1, 1)
      ws.mergeCells(outsourceMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '외주가공비'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }
  itemNo++

  // 직접비 - 운반/포장비
  ws.getCell(row, 1).value = itemNo
  ws.getCell(row, 2).value = '운반/포장비'
  ws.getCell(row, 3).value = '운반+포장'
  ws.getCell(row, 4).value = '-'
  ws.getCell(row, 5).value = '-'
  ws.getCell(row, 6).value = summary.deliveryCostTotal
  ws.getCell(row, 7).value = ''
  ws.getCell(row, 8).value = ''
  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(row, c)
    cell.border = thinBorder
    cell.font = { size: 10 }
    cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
    if (c === 6) cell.numFmt = '#,##0'
  }
  row++
  itemNo++

  // 직접비 - 소모품비
  const consumableMergeStart = row
  if (data.consumableCosts.length > 0) {
    data.consumableCosts.forEach((item, idx) => {
      ws.getCell(row, 1).value = idx === 0 ? itemNo : ''
      ws.getCell(row, 2).value = idx === 0 ? '소모품비' : ''
      ws.getCell(row, 3).value = item.itemName || '-'
      ws.getCell(row, 4).value = '-'
      ws.getCell(row, 5).value = '-'
      ws.getCell(row, 6).value = item.amount
      ws.getCell(row, 7).value = ''
      ws.getCell(row, 8).value = ''

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(row, c)
        cell.border = thinBorder
        cell.font = { size: 10 }
        cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
        if (c === 6) cell.numFmt = '#,##0'
      }
      row++
    })
    if (data.consumableCosts.length > 1) {
      ws.mergeCells(consumableMergeStart, 1, row - 1, 1)
      ws.mergeCells(consumableMergeStart, 2, row - 1, 2)
    }
  } else {
    ws.getCell(row, 1).value = itemNo
    ws.getCell(row, 2).value = '소모품비'
    ws.getCell(row, 3).value = '-'
    ws.getCell(row, 6).value = 0
    for (let c = 1; c <= 8; c++) {
      ws.getCell(row, c).border = thinBorder
      ws.getCell(row, c).font = { size: 10 }
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'middle' }
    }
    row++
  }

  // 직접비 소계 행
  ws.mergeCells(row, 1, row, 5)
  const directSubtotalLabel = ws.getCell(row, 1)
  directSubtotalLabel.value = '직접비 소계'
  directSubtotalLabel.font = { bold: true, size: 10 }
  directSubtotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  directSubtotalLabel.border = thinBorder
  directSubtotalLabel.alignment = { horizontal: 'center', vertical: 'middle' }

  const directSubtotalVal = ws.getCell(row, 6)
  directSubtotalVal.value = summary.directCostSubtotal
  directSubtotalVal.numFmt = '#,##0'
  directSubtotalVal.font = { bold: true, size: 10 }
  directSubtotalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  directSubtotalVal.border = thinBorder
  directSubtotalVal.alignment = { horizontal: 'right', vertical: 'middle' }

  ws.getCell(row, 7).value = ''
  ws.getCell(row, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  ws.getCell(row, 7).border = thinBorder

  const directSubtotalRate = ws.getCell(row, 8)
  directSubtotalRate.value = summary.totalRevenue > 0 ? summary.directCostSubtotal / summary.totalRevenue : 0
  directSubtotalRate.numFmt = '0.0%'
  directSubtotalRate.font = { bold: true, size: 10 }
  directSubtotalRate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  directSubtotalRate.border = thinBorder
  directSubtotalRate.alignment = { horizontal: 'right', vertical: 'middle' }

  ws.getRow(row).height = 22
  row++

  // ========== 간접비 섹션 ==========
  // 간접비 - 공통관리비
  ws.getCell(row, 1).value = itemNo + 1
  ws.getCell(row, 2).value = '공통관리비'
  ws.getCell(row, 3).value = `직접비 × ${data.overheadAndMargin.overheadRate}%`
  ws.getCell(row, 4).value = '-'
  ws.getCell(row, 5).value = '-'
  ws.getCell(row, 6).value = summary.overheadCost
  ws.getCell(row, 7).value = ''
  ws.getCell(row, 8).value = ''
  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(row, c)
    cell.border = thinBorder
    cell.font = { size: 10 }
    cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
    if (c === 6) cell.numFmt = '#,##0'
  }
  row++

  // 간접비 - 하자보수 예비비
  ws.getCell(row, 1).value = itemNo + 2
  ws.getCell(row, 2).value = '하자보수 예비비'
  ws.getCell(row, 3).value = `계약금액 × ${data.overheadAndMargin.warrantyReserveRate}%`
  ws.getCell(row, 4).value = '-'
  ws.getCell(row, 5).value = '-'
  ws.getCell(row, 6).value = summary.warrantyReserveCost
  ws.getCell(row, 7).value = ''
  ws.getCell(row, 8).value = ''
  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(row, c)
    cell.border = thinBorder
    cell.font = { size: 10 }
    cell.alignment = { horizontal: c <= 3 ? 'center' : 'right', vertical: 'middle' }
    if (c === 6) cell.numFmt = '#,##0'
  }
  row++

  // 간접비 소계 행
  ws.mergeCells(row, 1, row, 5)
  const indirectSubtotalLabel = ws.getCell(row, 1)
  indirectSubtotalLabel.value = '간접비 소계'
  indirectSubtotalLabel.font = { bold: true, size: 10 }
  indirectSubtotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  indirectSubtotalLabel.border = thinBorder
  indirectSubtotalLabel.alignment = { horizontal: 'center', vertical: 'middle' }

  const indirectSubtotalVal = ws.getCell(row, 6)
  indirectSubtotalVal.value = summary.indirectCostSubtotal
  indirectSubtotalVal.numFmt = '#,##0'
  indirectSubtotalVal.font = { bold: true, size: 10 }
  indirectSubtotalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  indirectSubtotalVal.border = thinBorder
  indirectSubtotalVal.alignment = { horizontal: 'right', vertical: 'middle' }

  ws.getCell(row, 7).value = ''
  ws.getCell(row, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  ws.getCell(row, 7).border = thinBorder

  const indirectSubtotalRate = ws.getCell(row, 8)
  indirectSubtotalRate.value = summary.totalRevenue > 0 ? summary.indirectCostSubtotal / summary.totalRevenue : 0
  indirectSubtotalRate.numFmt = '0.0%'
  indirectSubtotalRate.font = { bold: true, size: 10 }
  indirectSubtotalRate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }
  indirectSubtotalRate.border = thinBorder
  indirectSubtotalRate.alignment = { horizontal: 'right', vertical: 'middle' }

  ws.getRow(row).height = 22
  row++

  // ========== 총 비용 ==========
  ws.mergeCells(row, 1, row, 5)
  const totalCostLabel = ws.getCell(row, 1)
  totalCostLabel.value = '총 비용 (직접비 + 간접비)'
  totalCostLabel.font = { bold: true, size: 11 }
  totalCostLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } }
  totalCostLabel.border = thickBorder
  totalCostLabel.alignment = { horizontal: 'center', vertical: 'middle' }

  const totalCostVal = ws.getCell(row, 6)
  totalCostVal.value = summary.totalCost
  totalCostVal.numFmt = '#,##0'
  totalCostVal.font = { bold: true, size: 11 }
  totalCostVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } }
  totalCostVal.border = thickBorder
  totalCostVal.alignment = { horizontal: 'right', vertical: 'middle' }

  ws.getCell(row, 7).value = ''
  ws.getCell(row, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } }
  ws.getCell(row, 7).border = thickBorder

  const totalCostRate = ws.getCell(row, 8)
  totalCostRate.value = summary.totalRevenue > 0 ? summary.totalCost / summary.totalRevenue : 0
  totalCostRate.numFmt = '0.0%'
  totalCostRate.font = { bold: true, size: 11 }
  totalCostRate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } }
  totalCostRate.border = thickBorder
  totalCostRate.alignment = { horizontal: 'right', vertical: 'middle' }

  ws.getRow(row).height = 25
  row += 2

  // ========== 손익 분석 ==========
  ws.mergeCells(row, 1, row, 8)
  const profitHeader = ws.getCell(row, 1)
  profitHeader.value = '■ 손익 분석'
  profitHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } }
  profitHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } }
  row++

  // 손익 분석 테이블
  const profitData = [
    ['계약금액 (A)', summary.totalRevenue, ''],
    ['총 비용 (B)', summary.totalCost, ''],
    ['순이익 (A-B)', summary.profit, summary.profit >= 0 ? '흑자' : '적자'],
    ['이익률', summary.profitRate, '%'],
    ['목표 마진율', summary.targetMargin, '%'],
    ['목표 대비', summary.marginDifference, summary.marginDifference >= 0 ? '달성' : '미달'],
  ]

  profitData.forEach((rowData, idx) => {
    ws.mergeCells(row, 1, row, 3)
    const label = ws.getCell(row, 1)
    label.value = rowData[0] as string
    label.font = { bold: true, size: 10 }
    label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6DCE4' } }
    label.border = thinBorder
    label.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.mergeCells(row, 4, row, 6)
    const val = ws.getCell(row, 4)
    if (rowData[2] === '%') {
      val.value = (rowData[1] as number) / 100
      val.numFmt = '0.0%'
    } else {
      val.value = rowData[1]
      if (typeof rowData[1] === 'number') val.numFmt = '#,##0"원"'
    }
    val.font = { size: 10 }
    val.border = thinBorder
    val.alignment = { horizontal: 'right', vertical: 'middle' }

    // 순이익 행 강조
    if (idx === 2) {
      val.font = { bold: true, size: 11, color: { argb: summary.profit >= 0 ? '006400' : 'CC0000' } }
      val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: summary.profit >= 0 ? 'C6EFCE' : 'FFC7CE' } }
    }

    ws.mergeCells(row, 7, row, 8)
    const note = ws.getCell(row, 7)
    note.value = rowData[2] === '%' ? '' : rowData[2]
    note.font = { size: 10, color: { argb: (rowData[2] === '달성' || rowData[2] === '흑자') ? '006400' : (rowData[2] === '미달' || rowData[2] === '적자') ? 'CC0000' : '000000' } }
    note.border = thinBorder
    note.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getRow(row).height = 22
    row++
  })

  row += 2

  // ========== 생산성 지표 ==========
  ws.mergeCells(row, 1, row, 8)
  const prodHeader = ws.getCell(row, 1)
  prodHeader.value = '■ 생산성 지표'
  prodHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } }
  prodHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } }
  row++

  const prodData = [
    ['인당 매출액', summary.revenuePerPerson, '원/명'],
    ['인당 부가가치', summary.valueAddedPerPerson, '원/명'],
    ['공수 대비 효율', summary.efficiencyPerManHour, '원/M·H'],
  ]

  prodData.forEach(rowData => {
    ws.mergeCells(row, 1, row, 3)
    const label = ws.getCell(row, 1)
    label.value = rowData[0] as string
    label.font = { bold: true, size: 10 }
    label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6DCE4' } }
    label.border = thinBorder
    label.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.mergeCells(row, 4, row, 6)
    const val = ws.getCell(row, 4)
    val.value = rowData[1]
    val.numFmt = '#,##0'
    val.font = { size: 10 }
    val.border = thinBorder
    val.alignment = { horizontal: 'right', vertical: 'middle' }

    ws.mergeCells(row, 7, row, 8)
    const unit = ws.getCell(row, 7)
    unit.value = rowData[2]
    unit.font = { size: 10 }
    unit.border = thinBorder
    unit.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getRow(row).height = 22
    row++
  })

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = data.projectInfo.projectName
    ? `${data.projectInfo.projectName}_손익계산서.xlsx`
    : '손익계산서.xlsx'
  saveAs(blob, fileName)
}
