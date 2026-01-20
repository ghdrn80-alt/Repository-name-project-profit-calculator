/**
 * 달력 출근부 시스템 - Google Apps Script
 *
 * 사용법:
 * 1. 스프레드시트에서 확장 프로그램 > Apps Script 열기
 * 2. 이 코드를 Code.gs에 붙여넣기
 * 3. CalendarSidebar.html 파일 생성 후 HTML 코드 붙여넣기
 * 4. 저장 후 새로고침하면 "출근부" 메뉴가 나타남
 */

// 메뉴 생성
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('출근부')
    .addItem('출근자 선택', 'showAttendanceSidebar')
    .addItem('달력 시트 생성', 'createCalendarSheet')
    .addToUi();
}

// 사이드바 표시
function showAttendanceSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('CalendarSidebar')
    .setTitle('출근자 선택')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

// 시트1에서 이름 목록 가져오기
function getNameList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('시트1');

  if (!sheet) {
    return { success: false, message: '"시트1"을 찾을 수 없습니다.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return { success: true, data: [] };
  }

  // A열에서 이름 가져오기 (빈 셀 제외)
  const range = sheet.getRange(1, 1, lastRow, 1);
  const values = range.getValues();

  const names = values
    .map(row => row[0])
    .filter(name => name && String(name).trim() !== '');

  return { success: true, data: names };
}

// 현재 선택된 셀 정보 가져오기
function getSelectedCellInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const cell = sheet.getActiveCell();

  const sheetName = sheet.getName();
  const row = cell.getRow();
  const col = cell.getColumn();
  const cellValue = cell.getValue();
  const cellAddress = cell.getA1Notation();

  // 이미 입력된 이름들 파싱
  let existingNames = [];
  if (cellValue) {
    existingNames = String(cellValue).split(',').map(n => n.trim()).filter(n => n);
  }

  return {
    sheetName: sheetName,
    row: row,
    col: col,
    address: cellAddress,
    value: cellValue,
    existingNames: existingNames
  };
}

// 선택된 셀에 이름 저장
function saveAttendance(names) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const cell = sheet.getActiveCell();

    // 이름들을 쉼표로 구분하여 저장
    const value = names.join(', ');
    cell.setValue(value);

    return { success: true, message: '저장되었습니다: ' + cell.getA1Notation() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============ 달력 시트 자동 생성 ============

function createCalendarSheet() {
  const ui = SpreadsheetApp.getUi();

  // 년월 입력 받기
  const response = ui.prompt(
    '달력 생성',
    '년월을 입력하세요 (예: 2025-01)',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const input = response.getResponseText().trim();
  const match = input.match(/^(\d{4})-(\d{1,2})$/);

  if (!match) {
    ui.alert('형식 오류', '년월 형식이 올바르지 않습니다. (예: 2025-01)', ui.ButtonSet.OK);
    return;
  }

  const year = parseInt(match[1]);
  const month = parseInt(match[2]);

  if (month < 1 || month > 12) {
    ui.alert('형식 오류', '월은 1~12 사이여야 합니다.', ui.ButtonSet.OK);
    return;
  }

  generateCalendar(year, month);
  ui.alert('완료', year + '년 ' + month + '월 달력이 생성되었습니다.', ui.ButtonSet.OK);
}

function generateCalendar(year, month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = year + '년 ' + month + '월';

  // 기존 시트가 있으면 삭제
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }

  // 새 시트 생성
  sheet = ss.insertSheet(sheetName);

  // 요일 헤더
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  sheet.getRange(1, 1, 1, 7).setValues([weekdays]);
  sheet.getRange(1, 1, 1, 7)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#4285f4')
    .setFontColor('white');

  // 해당 월의 첫째 날과 마지막 날
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0=일요일

  // 달력 데이터 생성
  let currentRow = 2;
  let currentCol = startDayOfWeek + 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = sheet.getRange(currentRow, currentCol);
    cell.setValue(day);
    cell.setVerticalAlignment('top');
    cell.setFontWeight('bold');

    // 일요일은 빨간색
    if (currentCol === 1) {
      cell.setFontColor('#dc3545');
    }
    // 토요일은 파란색
    if (currentCol === 7) {
      cell.setFontColor('#0d6efd');
    }

    currentCol++;
    if (currentCol > 7) {
      currentCol = 1;
      currentRow++;
    }
  }

  // 셀 크기 조정
  for (let i = 1; i <= 7; i++) {
    sheet.setColumnWidth(i, 120);
  }
  for (let i = 2; i <= currentRow; i++) {
    sheet.setRowHeight(i, 80);
  }

  // 테두리 추가
  const lastCalendarRow = currentRow;
  sheet.getRange(1, 1, lastCalendarRow, 7)
    .setBorder(true, true, true, true, true, true);

  // 제목 행 추가
  sheet.insertRowBefore(1);
  sheet.getRange(1, 1, 1, 7).merge();
  sheet.getRange(1, 1)
    .setValue(year + '년 ' + month + '월 출근부')
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#f8f9fa');

  sheet.setRowHeight(1, 40);

  return sheet;
}

// 달력 셀 더블클릭 시 사이드바 열기 (onSelectionChange 사용)
function onSelectionChange(e) {
  // 참고: onSelectionChange는 Simple Trigger로 제한이 있음
  // 메뉴에서 사이드바를 여는 것을 권장
}
