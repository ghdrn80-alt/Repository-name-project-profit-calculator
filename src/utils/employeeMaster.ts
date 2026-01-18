import { EmployeeMaster } from '../types'

const STORAGE_KEY = 'employee-master'

// localStorage에서 직원 목록 불러오기
export function loadEmployeeMaster(): EmployeeMaster[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as EmployeeMaster[]
  } catch {
    console.error('직원 목록 불러오기 실패')
    return []
  }
}

// localStorage에 직원 목록 저장
export function saveEmployeeMaster(employees: EmployeeMaster[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees))
  } catch {
    console.error('직원 목록 저장 실패')
  }
}

// 직원 추가
export function addEmployee(
  employees: EmployeeMaster[],
  employee: Omit<EmployeeMaster, 'id'>
): EmployeeMaster[] {
  const newEmployee: EmployeeMaster = {
    ...employee,
    id: `emp_${Date.now()}`
  }
  const updated = [...employees, newEmployee]
  saveEmployeeMaster(updated)
  return updated
}

// 직원 수정
export function updateEmployee(
  employees: EmployeeMaster[],
  id: string,
  updates: Partial<Omit<EmployeeMaster, 'id'>>
): EmployeeMaster[] {
  const updated = employees.map((emp) =>
    emp.id === id ? { ...emp, ...updates } : emp
  )
  saveEmployeeMaster(updated)
  return updated
}

// 직원 삭제
export function removeEmployee(
  employees: EmployeeMaster[],
  id: string
): EmployeeMaster[] {
  const updated = employees.filter((emp) => emp.id !== id)
  saveEmployeeMaster(updated)
  return updated
}

// 기본값을 가진 빈 직원 생성
export function createEmptyEmployee(): Omit<EmployeeMaster, 'id'> {
  return {
    personName: '',
    rank: '',
    monthlySalary: 0,
    workingDaysPerMonth: 22,
    overheadRate: 15,
    hoursPerDay: 8
  }
}
