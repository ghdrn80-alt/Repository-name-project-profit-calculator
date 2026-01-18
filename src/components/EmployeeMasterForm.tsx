import { EmployeeMaster } from '../types'
import { createEmptyEmployee } from '../utils/employeeMaster'
import NumberInput from './NumberInput'

interface Props {
  employees: EmployeeMaster[]
  onAdd: (employee: Omit<EmployeeMaster, 'id'>) => void
  onUpdate: (id: string, updates: Partial<Omit<EmployeeMaster, 'id'>>) => void
  onRemove: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

function EmployeeMasterForm({ employees, onAdd, onUpdate, onRemove, isOpen, onClose }: Props) {
  const handleAdd = () => {
    onAdd(createEmptyEmployee())
  }

  const handleRemove = (id: string, name: string) => {
    if (window.confirm(`"${name || '이름 없음'}" 직원을 삭제하시겠습니까?`)) {
      onRemove(id)
    }
  }

  // 일당 계산 (간접비 포함)
  const calculateDailyRate = (emp: EmployeeMaster): number => {
    if (emp.workingDaysPerMonth === 0) return 0
    const baseDaily = emp.monthlySalary / emp.workingDaysPerMonth
    return Math.round(baseDaily * (1 + emp.overheadRate / 100))
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content employee-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>직원 관리</h2>
          <button onClick={onClose} className="btn-modal-close">&times;</button>
        </div>

        <p className="section-description">
          내부 직원 정보를 등록해두면 프로젝트에서 선택만으로 정보가 자동 입력됩니다.
        </p>

        {employees.length === 0 ? (
          <p className="empty-message">등록된 직원이 없습니다. 직원을 추가하세요.</p>
        ) : (
          <table className="data-table employee-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>직급</th>
                <th>월급여</th>
                <th>근무일수</th>
                <th>간접비율</th>
                <th>1일시간</th>
                <th>일당</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const dailyRate = calculateDailyRate(emp)
                return (
                  <tr key={emp.id}>
                    <td>
                      <input
                        type="text"
                        value={emp.personName}
                        onChange={(e) => onUpdate(emp.id, { personName: e.target.value })}
                        placeholder="이름"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={emp.rank}
                        onChange={(e) => onUpdate(emp.id, { rank: e.target.value })}
                        placeholder="직급"
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={emp.monthlySalary}
                        onChange={(val) => onUpdate(emp.id, { monthlySalary: val })}
                        placeholder="월급여"
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={emp.workingDaysPerMonth}
                        onChange={(val) => onUpdate(emp.id, { workingDaysPerMonth: val })}
                        placeholder="22"
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={emp.overheadRate}
                        onChange={(val) => onUpdate(emp.id, { overheadRate: val })}
                        placeholder="15"
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={emp.hoursPerDay}
                        onChange={(val) => onUpdate(emp.id, { hoursPerDay: val })}
                        placeholder="8"
                      />
                    </td>
                    <td className="calculated-daily-rate">
                      {dailyRate.toLocaleString()}원
                    </td>
                    <td>
                      <button
                        onClick={() => handleRemove(emp.id, emp.personName)}
                        className="btn btn-remove"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="modal-footer">
          <button onClick={handleAdd} className="btn btn-add">
            + 직원 추가
          </button>
          {employees.length > 0 && (
            <span className="employee-count">총 {employees.length}명 등록됨</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeMasterForm
