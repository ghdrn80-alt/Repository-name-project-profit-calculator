/**
 * 프로젝트 손익계산기 - Google Apps Script
 */

// 스프레드시트 ID 설정 (연결할 구글 시트 ID)
const SPREADSHEET_ID = '1uyXz5lM6_yATGR-35-22fIMjrgGQLmnPYPzaNteaucw';

// 스프레드시트 가져오기
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// 웹 앱 진입점
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('프로젝트 손익계산기')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// HTML 파일 포함 헬퍼
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============ 데이터 저장/불러오기 (스프레드시트 기반) ============

// 프로젝트 데이터 저장
function saveProjectData(projectData) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('프로젝트데이터');

    if (!sheet) {
      sheet = ss.insertSheet('프로젝트데이터');
    }

    sheet.clear();
    sheet.getRange('A1').setValue(JSON.stringify(projectData));

    return { success: true, message: '저장되었습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 프로젝트 데이터 불러오기
function loadProjectData() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('프로젝트데이터');

    if (!sheet) {
      return { success: true, data: null };
    }

    const value = sheet.getRange('A1').getValue();
    if (!value) {
      return { success: true, data: null };
    }

    return { success: true, data: JSON.parse(value) };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============ 직원 마스터 관리 ============

// 직원 마스터 저장
function saveEmployeeMaster(employees) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('직원마스터');

    if (!sheet) {
      sheet = ss.insertSheet('직원마스터');
      sheet.getRange('A1:F1').setValues([['ID', '이름', '직급', '월급여', '월근무일수', '간접비율']]);
      sheet.getRange('A1:F1').setFontWeight('bold');
    }

    // 기존 데이터 삭제 (헤더 제외)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    // 새 데이터 입력
    if (employees.length > 0) {
      const rows = employees.map(emp => [
        emp.id,
        emp.personName,
        emp.rank,
        emp.monthlySalary,
        emp.workingDaysPerMonth,
        emp.overheadRate
      ]);
      sheet.getRange(2, 1, rows.length, 6).setValues(rows);
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 직원 마스터 불러오기
function loadEmployeeMaster() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('직원마스터');

    if (!sheet) {
      return { success: true, data: [] };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    const employees = data.map(row => ({
      id: row[0] || generateId(),
      personName: row[1],
      rank: row[2],
      monthlySalary: Number(row[3]) || 0,
      workingDaysPerMonth: Number(row[4]) || 22,
      overheadRate: Number(row[5]) || 15,
      hoursPerDay: 8
    }));

    return { success: true, data: employees };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============ 외부 인원 공수표 (구글시트 연동) ============

// 외부 인원 공수표 시트에서 데이터 불러오기
function loadExternalWorkersFromSheet(sheetName) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName || '외부인원공수표');

    if (!sheet) {
      return { success: false, message: '시트를 찾을 수 없습니다: ' + (sheetName || '외부인원공수표') };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    // 헤더: 이름, 업체명, 직급, 일당, 투입일수, 비용항목
    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

    const workers = data
      .filter(row => row[0]) // 이름이 있는 행만
      .map(row => ({
        id: 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        personName: row[0] || '',
        company: row[1] || '',
        rank: row[2] || '',
        dailyRate: Number(row[3]) || 0,
        projectManDays: Number(row[4]) || 0,
        totalManDays: Number(row[4]) || 0,
        costCategory: convertCostCategory(row[5]),
        monthlyManDays: [],
        dailyManDaysPerMonth: []
      }));

    return { success: true, data: workers };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 비용 항목 변환
function convertCostCategory(value) {
  const str = String(value || '').trim();
  if (str.includes('설계')) return 'design';
  if (str.includes('판넬')) return 'panel';
  if (str.includes('배선')) return 'wiring';
  if (str.includes('셋업') || str.includes('시운전')) return 'setup';
  return 'other';
}

// ID 생성
function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============ 시트 목록 가져오기 ============

function getSheetNames() {
  const ss = getSpreadsheet();
  return ss.getSheets().map(sheet => sheet.getName());
}

// ============ 스프레드시트 목록 가져오기 ============

// 사용자의 스프레드시트 목록 가져오기
function getSpreadsheetList() {
  try {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    const spreadsheets = [];

    while (files.hasNext()) {
      const file = files.next();
      spreadsheets.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        lastUpdated: file.getLastUpdated().toISOString()
      });
    }

    // 최근 수정일 기준 정렬
    spreadsheets.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    return { success: true, data: spreadsheets };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 특정 스프레드시트의 시트 목록 가져오기
function getSheetsFromSpreadsheet(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets().map(sheet => ({
      name: sheet.getName(),
      rowCount: sheet.getLastRow(),
      colCount: sheet.getLastColumn()
    }));

    return { success: true, data: sheets };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 특정 스프레드시트에서 프로젝트 데이터 불러오기
function loadProjectFromSpreadsheet(spreadsheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName || '프로젝트데이터');

    if (!sheet) {
      return { success: false, message: '시트를 찾을 수 없습니다: ' + (sheetName || '프로젝트데이터') };
    }

    const value = sheet.getRange('A1').getValue();
    if (!value) {
      return { success: false, message: '데이터가 없습니다.' };
    }

    // JSON 형식인지 확인
    try {
      const data = JSON.parse(value);
      return { success: true, data: data };
    } catch (parseError) {
      return { success: false, message: '유효한 JSON 데이터가 아닙니다.' };
    }
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 특정 스프레드시트에서 외부 인원 데이터 불러오기
function loadWorkersFromSpreadsheet(spreadsheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { success: false, message: '시트를 찾을 수 없습니다: ' + sheetName };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    // 헤더: 이름, 업체명, 직급, 일당, 투입일수, 비용항목
    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

    const workers = data
      .filter(row => row[0]) // 이름이 있는 행만
      .map(row => ({
        id: 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        personName: row[0] || '',
        company: row[1] || '',
        rank: row[2] || '',
        dailyRate: Number(row[3]) || 0,
        projectManDays: Number(row[4]) || 0,
        totalManDays: Number(row[4]) || 0,
        costCategory: convertCostCategory(row[5]),
        monthlyManDays: [],
        dailyManDaysPerMonth: []
      }));

    return { success: true, data: workers };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 시트 미리보기 (처음 5행)
function getSheetPreview(spreadsheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { success: false, message: '시트를 찾을 수 없습니다.' };
    }

    const lastRow = Math.min(sheet.getLastRow(), 6); // 헤더 + 5행
    const lastCol = Math.min(sheet.getLastColumn(), 10); // 최대 10열

    if (lastRow === 0 || lastCol === 0) {
      return { success: true, data: [] };
    }

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    return { success: true, data: data };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============ 외부 인원 공수표 템플릿 생성 ============

// ============ 프로젝트 마스터 관리 ============

// 프로젝트 마스터 저장
function saveProjectMaster(projects) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('프로젝트마스터');

    if (!sheet) {
      sheet = ss.insertSheet('프로젝트마스터');
      sheet.getRange('A1:D1').setValues([['ID', '프로젝트코드', '프로젝트명', '계약일']]);
      sheet.getRange('A1:D1').setFontWeight('bold');
    }

    // 기존 데이터 삭제 (헤더 제외)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    // 새 데이터 입력
    if (projects.length > 0) {
      const rows = projects.map(proj => [
        proj.id,
        proj.projectCode,
        proj.projectName,
        proj.contractDate
      ]);
      sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 프로젝트 마스터 불러오기
function loadProjectMaster() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('프로젝트마스터');

    if (!sheet) {
      return { success: true, data: [] };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const projects = data.map(row => ({
      id: row[0] || generateId(),
      projectCode: row[1] || '',
      projectName: row[2] || '',
      contractDate: row[3] || ''
    }));

    return { success: true, data: projects };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============ 출근부 데이터 저장/불러오기 ============

// 출근부 데이터 저장
function saveAttendanceData(attendanceData) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('출근부데이터');

    if (!sheet) {
      sheet = ss.insertSheet('출근부데이터');
    }

    sheet.clear();
    sheet.getRange('A1').setValue(JSON.stringify(attendanceData));

    return { success: true, message: '출근부 저장됨' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 출근부 데이터 불러오기
function loadAttendanceData() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('출근부데이터');

    if (!sheet) {
      return { success: true, data: { workers: [], records: {} } };
    }

    const value = sheet.getRange('A1').getValue();
    if (!value) {
      return { success: true, data: { workers: [], records: {} } };
    }

    return { success: true, data: JSON.parse(value) };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function createExternalWorkerTemplate() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('외부인원공수표');

    if (sheet) {
      return { success: false, message: '이미 "외부인원공수표" 시트가 존재합니다.' };
    }

    sheet = ss.insertSheet('외부인원공수표');

    // 헤더 설정
    const headers = ['이름', '업체명', '직급', '일당', '투입일수', '비용항목'];
    sheet.getRange('A1:F1').setValues([headers]);
    sheet.getRange('A1:F1').setFontWeight('bold');
    sheet.getRange('A1:F1').setBackground('#4a90d9');
    sheet.getRange('A1:F1').setFontColor('white');

    // 예시 데이터
    const exampleData = [
      ['홍길동', 'ABC전기', '기사', 250000, 10, '배선공사'],
      ['김철수', 'XYZ설비', '기능사', 200000, 15, '배관공사'],
    ];
    sheet.getRange(2, 1, exampleData.length, 6).setValues(exampleData);

    // 열 너비 조정
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 80);
    sheet.setColumnWidth(6, 100);

    // 비용항목 드롭다운
    const costCategoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['배선공사', '배관공사', '설계', '판넬', '셋업', '기타'])
      .build();
    sheet.getRange('F2:F100').setDataValidation(costCategoryRule);

    return { success: true, message: '"외부인원공수표" 시트가 생성되었습니다.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
