import { useRef, useState } from 'react'
import { ManHourCost, ManHourWorker, ManHourCostCategory } from '../types'
import { readExcelFile, parseManHourExcel, calculateManHourTotal } from '../utils/manHourImport'
import NumberInput from './NumberInput'
import ManHourCalendar from './ManHourCalendar'

interface Props {
  data: ManHourCost
  onChange: (data: ManHourCost) => void
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

function ManHourCostForm({ data, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const workbook = await readExcelFile(file)
      const manHourCost = parseManHourExcel(workbook)
      manHourCost.sourceFile = file.name
      onChange(manHourCost)
      alert(`공수표를 불러왔습니다. (${manHourCost.workers.length}명)`)
    } catch (error) {
      alert('공수표 파일을 읽는 중 오류가 발생했습니다: ' + (error as Error).message)
    }

    // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = ''
  }

  const addWorker = () => {
    const newWorker: ManHourWorker = {
      id: `mh_${Date.now()}`,
      personName: '',
      company: '',
      rank: '',
      dailyRate: 0,
      totalManDays: 0,
      monthlyManDays: Array(12).fill(0),
      dailyManDaysPerMonth: createEmptyDailyManDays(),
      costCategory: 'wiring'  // 기본값: 기체 배선비
    }
    onChange({
      ...data,
      workers: [...data.workers, newWorker]
    })
  }

  // 일별 공수 업데이트 (캘린더에서 호출)
  const updateWorkerDaily = (workerId: string, month: number, dayIndex: number, value: number) => {
    onChange({
      ...data,
      workers: data.workers.map((worker) => {
        if (worker.id !== workerId) return worker

        // dailyManDaysPerMonth 초기화 (없는 경우)
        const dailyManDaysPerMonth = worker.dailyManDaysPerMonth || createEmptyDailyManDays()
        const newDailyManDaysPerMonth = dailyManDaysPerMonth.map((monthDays, m) => {
          if (m !== month) return [...monthDays]
          const newMonthDays = [...monthDays]
          newMonthDays[dayIndex] = value
          return newMonthDays
        })

        // 월별 합계 재계산
        const newMonthlyManDays = newDailyManDaysPerMonth.map(monthDays =>
          monthDays.reduce((sum, d) => sum + (d || 0), 0)
        )

        // 총 공수 재계산
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

  const updateWorker = (id: string, field: keyof ManHourWorker, value: string | number) => {
    onChange({
      ...data,
      workers: data.workers.map((worker) =>
        worker.id === id ? { ...worker, [field]: value } : worker
      )
    })
  }

  const removeWorker = (id: string) => {
    onChange({
      ...data,
      workers: data.workers.filter((worker) => worker.id !== id)
    })
  }

  const clearAll = () => {
    if (window.confirm('모든 공수 데이터를 삭제하시겠습니까?')) {
      onChange({
        workers: [],
        sourceFile: undefined,
        importedAt: undefined
      })
    }
  }

  const totalCost = calculateManHourTotal(data)
  const totalManDays = data.workers.reduce((sum, w) => sum + w.totalManDays, 0)

  return (
    <section className="form-section manhour-section">
      <div className="section-header">
        <h2>공수 인건비</h2>
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
          <button onClick={addWorker} className="btn btn-add">
            + 추가
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`btn ${showCalendar ? 'btn-active' : 'btn-secondary'}`}
          >
            {showCalendar ? '캘린더 닫기' : '캘린더 보기'}
          </button>
          {data.workers.length > 0 && (
            <button onClick={clearAll} className="btn btn-secondary">
              초기화
            </button>
          )}
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
          workers={data.workers}
          onUpdateWorkerDaily={updateWorkerDaily}
        />
      )}

      {data.workers.length === 0 ? (
        <p className="empty-message">공수표 엑셀 파일을 임포트하거나 작업자를 추가하세요</p>
      ) : (
        <table className="data-table manhour-table">
          <thead>
            <tr>
              <th>비용 항목</th>
              <th>소속</th>
              <th>작업자</th>
              <th>일당 (원)</th>
              <th>총 공수 (M/D)</th>
              <th>소계</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.workers.map((worker) => (
              <tr key={worker.id} data-id={worker.id} className={`category-${worker.costCategory || 'wiring'}`}>
                <td>
                  <select
                    value={worker.costCategory || 'wiring'}
                    onChange={(e) => updateWorker(worker.id, 'costCategory', e.target.value)}
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
                    onChange={(e) => updateWorker(worker.id, 'company', e.target.value)}
                    placeholder="소속"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={worker.personName}
                    onChange={(e) => updateWorker(worker.id, 'personName', e.target.value)}
                    placeholder="이름"
                  />
                </td>
                <td>
                  <NumberInput
                    value={worker.dailyRate}
                    onChange={(val) => updateWorker(worker.id, 'dailyRate', val)}
                  />
                </td>
                <td>
                  <NumberInput
                    value={worker.totalManDays}
                    onChange={(val) => updateWorker(worker.id, 'totalManDays', val)}
                    placeholder="0"
                  />
                </td>
                <td className="subtotal">
                  {(worker.totalManDays * worker.dailyRate).toLocaleString()}원
                </td>
                <td>
                  <button
                    onClick={() => removeWorker(worker.id)}
                    className="btn btn-remove"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="total-label">공수 인건비 합계</td>
              <td className="total-value">{totalManDays.toFixed(1)} M/D</td>
              <td colSpan={2} className="total-value">
                {totalCost.toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {data.workers.length > 0 && (
        <div className="manhour-summary">
          <h4>비용 항목별 공수 집계</h4>
          <div className="category-summary">
            {COST_CATEGORIES.map((cat) => {
              const categoryWorkers = data.workers.filter(w => (w.costCategory || 'wiring') === cat.value)
              const categoryManDays = categoryWorkers.reduce((sum, w) => sum + w.totalManDays, 0)
              const categoryCost = categoryWorkers.reduce((sum, w) => sum + w.totalManDays * w.dailyRate, 0)
              if (categoryManDays === 0) return null
              return (
                <div key={cat.value} className={`category-item category-${cat.value}`}>
                  <span className="category-label">{cat.label}</span>
                  <span className="category-mandays">{categoryManDays.toFixed(1)} M/D</span>
                  <span className="category-cost">{categoryCost.toLocaleString()}원</span>
                </div>
              )
            })}
          </div>

          <h4>작업자별 월별 공수 현황</h4>
          <table className="data-table monthly-table">
            <thead>
              <tr>
                <th>비용 항목</th>
                <th>작업자</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i}>{i + 1}월</th>
                ))}
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {data.workers.map((worker) => (
                <tr key={worker.id} className={`category-${worker.costCategory || 'wiring'}`}>
                  <td className="category-cell">
                    {COST_CATEGORIES.find(c => c.value === (worker.costCategory || 'wiring'))?.label}
                  </td>
                  <td>{worker.personName}</td>
                  {worker.monthlyManDays.map((md, i) => (
                    <td key={i} className={md > 0 ? 'has-value' : ''}>
                      {md > 0 ? md.toFixed(1) : '-'}
                    </td>
                  ))}
                  <td className="total-value">{worker.totalManDays.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="total-label">합계</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const monthTotal = data.workers.reduce(
                    (sum, w) => sum + (w.monthlyManDays[i] || 0), 0
                  )
                  return (
                    <td key={i} className={monthTotal > 0 ? 'has-value' : ''}>
                      {monthTotal > 0 ? monthTotal.toFixed(1) : '-'}
                    </td>
                  )
                })}
                <td className="total-value">{totalManDays.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

export default ManHourCostForm
