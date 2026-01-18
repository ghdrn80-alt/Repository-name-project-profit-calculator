import { useRef, useState } from 'react'
import { ManHourCost, InternalWorker, ExternalWorker, ManHourCostCategory, EmployeeMaster } from '../types'
import {
  readExcelFile,
  parseManHourExcel,
  calculateInternalTotal,
  calculateExternalTotal,
  calculateInternalDailyRate,
  calculateInternalWorkerCost,
  calculateExternalWorkerCost,
  calculateInternalManDays,
  calculateExternalManDays,
  calculateInternalManDaysFromHours,
  calculateInternalTotalHours
} from '../utils/manHourImport'
import NumberInput from './NumberInput'
import ManHourCalendar from './ManHourCalendar'

interface Props {
  data: ManHourCost
  onChange: (data: ManHourCost) => void
  employees: EmployeeMaster[]
}

const COST_CATEGORIES: { value: ManHourCostCategory; label: string }[] = [
  { value: 'design', label: '전장설계비' },
  { value: 'panel', label: '판넬 제작비' },
  { value: 'wiring', label: '기체 배선비' },
  { value: 'setup', label: '시운전/셋업' },
  { value: 'other', label: '기타' },
]

// 빈 일별 공수 배열 생성 (12개월 x 31일)
const createEmptyDailyManDays = () => Array(12).fill(null).map(() => Array(31).fill(0))

function ManHourCostForm({ data, onChange, employees }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  // 데이터 마이그레이션 (기존 workers 배열이 있는 경우)
  const internalWorkers = data.internalWorkers || []
  const externalWorkers = data.externalWorkers || data.workers || []

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const workbook = await readExcelFile(file)
      const imported = parseManHourExcel(workbook)
      onChange({
        ...data,
        internalWorkers,
        externalWorkers: imported.externalWorkers,
        sourceFile: file.name,
        importedAt: imported.importedAt
      })
      alert(`공수표를 불러왔습니다. (외부 인원 ${imported.externalWorkers.length}명)`)
    } catch (error) {
      alert('공수표 파일을 읽는 중 오류가 발생했습니다: ' + (error as Error).message)
    }

    e.target.value = ''
  }

  // 직원 선택해서 내부 인원 추가
  const addFromEmployee = () => {
    if (!selectedEmployeeId) return

    if (selectedEmployeeId === 'manual') {
      // 직접 입력
      const newWorker: InternalWorker = {
        id: `int_${Date.now()}`,
        personName: '',
        rank: '',
        monthlySalary: 0,
        workingDaysPerMonth: 22,
        overheadRate: 15,
        hoursPerDay: 8,
        projectHours: 0,
        costCategory: 'wiring'
      }
      onChange({
        ...data,
        internalWorkers: [...internalWorkers, newWorker],
        externalWorkers
      })
    } else {
      // 마스터에서 선택
      const emp = employees.find((e) => e.id === selectedEmployeeId)
      if (!emp) return

      const newWorker: InternalWorker = {
        id: `int_${Date.now()}`,
        personName: emp.personName,
        rank: emp.rank,
        monthlySalary: emp.monthlySalary,
        workingDaysPerMonth: emp.workingDaysPerMonth,
        overheadRate: emp.overheadRate,
        hoursPerDay: emp.hoursPerDay,
        projectHours: 0,
        costCategory: 'wiring',
        employeeId: emp.id
      }
      onChange({
        ...data,
        internalWorkers: [...internalWorkers, newWorker],
        externalWorkers
      })
    }
    setSelectedEmployeeId('')
  }

  // 내부 인원 추가 (레거시 - 직접 입력 버튼용)
  const addInternalWorker = () => {
    const newWorker: InternalWorker = {
      id: `int_${Date.now()}`,
      personName: '',
      rank: '',
      monthlySalary: 0,
      workingDaysPerMonth: 22,
      overheadRate: 15,
      hoursPerDay: 8,
      projectHours: 0,
      costCategory: 'wiring'
    }
    onChange({
      ...data,
      internalWorkers: [...internalWorkers, newWorker],
      externalWorkers
    })
  }

  // 외부 인원 추가
  const addExternalWorker = () => {
    const newWorker: ExternalWorker = {
      id: `ext_${Date.now()}`,
      personName: '',
      company: '',
      rank: '',
      dailyRate: 0,
      totalManDays: 0,
      projectManDays: 0,
      monthlyManDays: Array(12).fill(0),
      dailyManDaysPerMonth: createEmptyDailyManDays(),
      costCategory: 'wiring'
    }
    onChange({
      ...data,
      internalWorkers,
      externalWorkers: [...externalWorkers, newWorker]
    })
  }

  // 내부 인원 수정
  const updateInternalWorker = (id: string, field: keyof InternalWorker, value: string | number) => {
    onChange({
      ...data,
      internalWorkers: internalWorkers.map((worker) =>
        worker.id === id ? { ...worker, [field]: value } : worker
      ),
      externalWorkers
    })
  }

  // 외부 인원 수정
  const updateExternalWorker = (id: string, field: keyof ExternalWorker, value: string | number) => {
    onChange({
      ...data,
      internalWorkers,
      externalWorkers: externalWorkers.map((worker) =>
        worker.id === id ? { ...worker, [field]: value } : worker
      )
    })
  }

  // 일별 공수 업데이트 (캘린더에서 호출 - 외부 인원용)
  const updateExternalWorkerDaily = (workerId: string, month: number, dayIndex: number, value: number) => {
    onChange({
      ...data,
      internalWorkers,
      externalWorkers: externalWorkers.map((worker) => {
        if (worker.id !== workerId) return worker

        const dailyManDaysPerMonth = worker.dailyManDaysPerMonth || createEmptyDailyManDays()
        const newDailyManDaysPerMonth = dailyManDaysPerMonth.map((monthDays, m) => {
          if (m !== month) return [...monthDays]
          const newMonthDays = [...monthDays]
          newMonthDays[dayIndex] = value
          return newMonthDays
        })

        const newMonthlyManDays = newDailyManDaysPerMonth.map(monthDays =>
          monthDays.reduce((sum, d) => sum + (d || 0), 0)
        )

        const newTotalManDays = newMonthlyManDays.reduce((sum, m) => sum + m, 0)

        return {
          ...worker,
          dailyManDaysPerMonth: newDailyManDaysPerMonth,
          monthlyManDays: newMonthlyManDays,
          totalManDays: newTotalManDays
        }
      })
    })
  }

  // 내부 인원 삭제
  const removeInternalWorker = (id: string) => {
    onChange({
      ...data,
      internalWorkers: internalWorkers.filter((worker) => worker.id !== id),
      externalWorkers
    })
  }

  // 외부 인원 삭제
  const removeExternalWorker = (id: string) => {
    onChange({
      ...data,
      internalWorkers,
      externalWorkers: externalWorkers.filter((worker) => worker.id !== id)
    })
  }

  const clearAll = () => {
    if (window.confirm('모든 공수 데이터를 삭제하시겠습니까?')) {
      onChange({
        internalWorkers: [],
        externalWorkers: [],
        sourceFile: undefined,
        importedAt: undefined
      })
    }
  }

  const manHourData: ManHourCost = { internalWorkers, externalWorkers }
  const internalTotalCost = calculateInternalTotal(manHourData)
  const externalTotalCost = calculateExternalTotal(manHourData)
  const totalCost = internalTotalCost + externalTotalCost
  const internalManDays = calculateInternalManDays(manHourData)
  const internalTotalHours = calculateInternalTotalHours(manHourData)
  const externalManDays = calculateExternalManDays(manHourData)

  return (
    <section className="form-section manhour-section">
      <div className="section-header">
        <h2>공수 인건비</h2>
        <div className="header-buttons">
          {(internalWorkers.length > 0 || externalWorkers.length > 0) && (
            <button onClick={clearAll} className="btn btn-secondary">
              전체 초기화
            </button>
          )}
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="manhour-tabs">
        <button
          className={`tab-btn ${activeTab === 'internal' ? 'active' : ''}`}
          onClick={() => setActiveTab('internal')}
        >
          내부 인원 ({internalWorkers.length}명)
        </button>
        <button
          className={`tab-btn ${activeTab === 'external' ? 'active' : ''}`}
          onClick={() => setActiveTab('external')}
        >
          외부 인원 (공수표) ({externalWorkers.length}명)
        </button>
      </div>

      {/* 내부 인원 섹션 */}
      {activeTab === 'internal' && (
        <div className="internal-section">
          <div className="section-sub-header">
            <h3>내부 인원 (월급여 기반)</h3>
            <div className="employee-add-controls">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="employee-select"
              >
                <option value="">직원 선택...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.personName} ({emp.rank}) - 월 {emp.monthlySalary.toLocaleString()}원
                  </option>
                ))}
                <option value="manual">직접 입력...</option>
              </select>
              <button
                onClick={addFromEmployee}
                className="btn btn-add"
                disabled={!selectedEmployeeId}
              >
                + 추가
              </button>
            </div>
          </div>

          <p className="section-description">
            직원 마스터에서 선택하면 급여 정보가 자동 적용됩니다. 투입시간만 입력하세요.
          </p>

          {internalWorkers.length === 0 ? (
            <p className="empty-message">내부 인원을 추가하세요</p>
          ) : (
            <table className="data-table manhour-table internal-table">
              <thead>
                <tr>
                  <th>비용 항목</th>
                  <th>이름</th>
                  <th>일당</th>
                  <th>투입시간</th>
                  <th>M/D</th>
                  <th>소계</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {internalWorkers.map((worker) => {
                  const dailyRate = calculateInternalDailyRate(worker)
                  const manDays = calculateInternalManDaysFromHours(worker)
                  const cost = calculateInternalWorkerCost(worker)
                  return (
                    <tr key={worker.id} className={`category-${worker.costCategory || 'wiring'}`}>
                      <td>
                        <select
                          value={worker.costCategory || 'wiring'}
                          onChange={(e) => updateInternalWorker(worker.id, 'costCategory', e.target.value)}
                        >
                          {COST_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="worker-name">
                        {worker.employeeId ? (
                          <span>{worker.personName}</span>
                        ) : (
                          <input
                            type="text"
                            value={worker.personName}
                            onChange={(e) => updateInternalWorker(worker.id, 'personName', e.target.value)}
                            placeholder="이름"
                          />
                        )}
                      </td>
                      <td>
                        {worker.employeeId ? (
                          <span className="calculated-value">{dailyRate.toLocaleString()}</span>
                        ) : (
                          <NumberInput
                            value={worker.manualDailyRate || 0}
                            onChange={(val) => updateInternalWorker(worker.id, 'manualDailyRate', val)}
                            placeholder="일당"
                          />
                        )}
                      </td>
                      <td>
                        <NumberInput
                          value={worker.projectHours || 0}
                          onChange={(val) => updateInternalWorker(worker.id, 'projectHours', val)}
                          placeholder="0"
                        />
                      </td>
                      <td className="calculated-value">
                        {manDays.toFixed(1)}
                      </td>
                      <td className="subtotal">
                        {cost.toLocaleString()}원
                      </td>
                      <td>
                        <button
                          onClick={() => removeInternalWorker(worker.id)}
                          className="btn btn-remove"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="total-label">내부 인원 합계</td>
                  <td className="total-value text-center">{internalTotalHours}h</td>
                  <td className="total-value text-center">{internalManDays.toFixed(1)}</td>
                  <td colSpan={2} className="total-value text-right">
                    {internalTotalCost.toLocaleString()}원
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* 외부 인원 (공수표) 섹션 */}
      {activeTab === 'external' && (
        <div className="external-section">
          <div className="section-sub-header">
            <h3>외부 인원 - 공수표 (일당 기반)</h3>
            <div className="header-buttons">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
              />
              <button onClick={handleImportClick} className="btn btn-primary">
                엑셀 임포트
              </button>
              <button onClick={addExternalWorker} className="btn btn-add">
                + 외부 인원 추가
              </button>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`btn ${showCalendar ? 'btn-active' : 'btn-secondary'}`}
              >
                {showCalendar ? '캘린더 닫기' : '캘린더 보기'}
              </button>
            </div>
          </div>

          {data.sourceFile && (
            <p className="import-info">
              파일: {data.sourceFile}
              {data.importedAt && ` (${new Date(data.importedAt).toLocaleString()})`}
            </p>
          )}

          {showCalendar && (
            <ManHourCalendar
              workers={externalWorkers}
              onUpdateWorkerDaily={updateExternalWorkerDaily}
            />
          )}

          {externalWorkers.length === 0 ? (
            <p className="empty-message">공수표 엑셀 파일을 임포트하거나 외부 인원을 추가하세요</p>
          ) : (
            <table className="data-table manhour-table">
              <thead>
                <tr>
                  <th>비용 항목</th>
                  <th>업체명</th>
                  <th>작업자</th>
                  <th>일당 (원)</th>
                  <th>총 공수</th>
                  <th>이 프로젝트</th>
                  <th>소계</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {externalWorkers.map((worker) => {
                  const cost = calculateExternalWorkerCost(worker)
                  return (
                    <tr key={worker.id} className={`category-${worker.costCategory || 'wiring'}`}>
                      <td>
                        <select
                          value={worker.costCategory || 'wiring'}
                          onChange={(e) => updateExternalWorker(worker.id, 'costCategory', e.target.value)}
                        >
                          {COST_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={worker.company}
                          onChange={(e) => updateExternalWorker(worker.id, 'company', e.target.value)}
                          placeholder="업체명"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={worker.personName}
                          onChange={(e) => updateExternalWorker(worker.id, 'personName', e.target.value)}
                          placeholder="이름"
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={worker.dailyRate}
                          onChange={(val) => updateExternalWorker(worker.id, 'dailyRate', val)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={worker.totalManDays}
                          onChange={(val) => updateExternalWorker(worker.id, 'totalManDays', val)}
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={worker.projectManDays ?? 0}
                          onChange={(val) => updateExternalWorker(worker.id, 'projectManDays', val)}
                          placeholder="0"
                        />
                      </td>
                      <td className="subtotal">
                        {cost.toLocaleString()}원
                      </td>
                      <td>
                        <button
                          onClick={() => removeExternalWorker(worker.id)}
                          className="btn btn-remove"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="total-label">외부 인원 합계</td>
                  <td className="total-value text-center">{externalWorkers.reduce((s, w) => s + w.totalManDays, 0).toFixed(1)}</td>
                  <td className="total-value text-center">{externalManDays.toFixed(1)}</td>
                  <td colSpan={2} className="total-value text-right">
                    {externalTotalCost.toLocaleString()}원
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* 전체 요약 */}
      <div className="manhour-total-summary">
        <h4>공수 인건비 총 합계</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">내부 인원</span>
            <span className="value">{internalManDays.toFixed(1)} M/D</span>
            <span className="cost">{internalTotalCost.toLocaleString()}원</span>
          </div>
          <div className="summary-item">
            <span className="label">외부 인원</span>
            <span className="value">{externalManDays.toFixed(1)} M/D</span>
            <span className="cost">{externalTotalCost.toLocaleString()}원</span>
          </div>
          <div className="summary-item total">
            <span className="label">총 합계</span>
            <span className="value">{(internalManDays + externalManDays).toFixed(1)} M/D</span>
            <span className="cost">{totalCost.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 비용 항목별 집계 */}
      {(internalWorkers.length > 0 || externalWorkers.length > 0) && (
        <div className="manhour-summary">
          <h4>비용 항목별 공수 집계</h4>
          <div className="category-summary">
            {COST_CATEGORIES.map((cat) => {
              const intWorkers = internalWorkers.filter(w => (w.costCategory || 'wiring') === cat.value)
              const extWorkers = externalWorkers.filter(w => (w.costCategory || 'wiring') === cat.value)
              const intManDays = intWorkers.reduce((sum, w) => sum + calculateInternalManDaysFromHours(w), 0)
              const extManDays = extWorkers.reduce((sum, w) => sum + (w.projectManDays ?? 0), 0)
              const intCost = intWorkers.reduce((sum, w) => sum + calculateInternalWorkerCost(w), 0)
              const extCost = extWorkers.reduce((sum, w) => sum + calculateExternalWorkerCost(w), 0)
              const totalManDays = intManDays + extManDays
              const totalCategoryCost = intCost + extCost
              if (totalManDays === 0 && totalCategoryCost === 0) return null
              return (
                <div key={cat.value} className={`category-item category-${cat.value}`}>
                  <span className="category-label">{cat.label}</span>
                  <span className="category-detail">
                    내부 {intManDays.toFixed(1)} + 외부 {extManDays.toFixed(1)}
                  </span>
                  <span className="category-mandays">{totalManDays.toFixed(1)} M/D</span>
                  <span className="category-cost">{totalCategoryCost.toLocaleString()}원</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default ManHourCostForm
