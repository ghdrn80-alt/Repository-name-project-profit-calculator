import { useState, useMemo } from 'react'
import { ManHourWorker, ManHourCostCategory } from '../types'

interface Props {
  workers: ManHourWorker[]
  onUpdateWorkerDaily: (id: string, month: number, day: number, value: number) => void
}

const COST_CATEGORIES: { value: ManHourCostCategory; label: string }[] = [
  { value: 'design', label: '설계' },
  { value: 'panel', label: '판넬' },
  { value: 'wiring', label: '배선' },
  { value: 'setup', label: '셋업' },
  { value: 'other', label: '기타' },
]

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토']

function ManHourCalendar({ workers, onUpdateWorkerDaily }: Props) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-indexed
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(
    workers.length > 0 ? workers[0].id : null
  )

  // 선택된 작업자
  const selectedWorker = useMemo(
    () => workers.find(w => w.id === selectedWorkerId),
    [workers, selectedWorkerId]
  )

  // 작업자 목록이 변경되면 선택 업데이트
  useMemo(() => {
    if (workers.length > 0 && !workers.find(w => w.id === selectedWorkerId)) {
      setSelectedWorkerId(workers[0].id)
    }
  }, [workers, selectedWorkerId])

  // 해당 월의 일수 및 시작 요일 계산
  const calendarData = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday

    return { daysInMonth, startDayOfWeek }
  }, [selectedYear, selectedMonth])

  // 월 변경
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear(y => y - 1)
      setSelectedMonth(11)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedYear(y => y + 1)
      setSelectedMonth(0)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  // 일별 공수 업데이트
  const handleDayChange = (day: number, value: string) => {
    if (!selectedWorker) return
    const numValue = parseFloat(value) || 0
    onUpdateWorkerDaily(selectedWorker.id, selectedMonth, day - 1, numValue)
  }

  // 특정 일의 공수 값 가져오기
  const getDayValue = (day: number): number => {
    if (!selectedWorker) return 0
    return selectedWorker.dailyManDaysPerMonth?.[selectedMonth]?.[day - 1] || 0
  }

  // 해당 월의 총 공수
  const monthTotal = selectedWorker?.monthlyManDays[selectedMonth] || 0

  // 캘린더 그리드 생성
  const renderCalendarGrid = () => {
    const { daysInMonth, startDayOfWeek } = calendarData
    const cells: JSX.Element[] = []

    // 빈 셀 (이전 달)
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>)
    }

    // 일별 셀
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day)
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dayValue = getDayValue(day)

      cells.push(
        <div
          key={day}
          className={`calendar-cell ${isWeekend ? 'weekend' : ''} ${dayValue > 0 ? 'has-value' : ''} ${dayValue >= 1.5 ? 'overtime' : ''}`}
        >
          <span className="day-number">{day}</span>
          <input
            type="number"
            step="0.5"
            min="0"
            max="3"
            value={dayValue || ''}
            onChange={(e) => handleDayChange(day, e.target.value)}
            placeholder="-"
            disabled={!selectedWorker}
          />
        </div>
      )
    }

    return cells
  }

  // 전체 작업자 월별 요약
  const monthSummary = useMemo(() => {
    return workers.map(worker => ({
      ...worker,
      monthValue: worker.monthlyManDays[selectedMonth] || 0
    }))
  }, [workers, selectedMonth])

  if (workers.length === 0) {
    return (
      <div className="calendar-empty">
        <p>작업자를 먼저 추가하거나 공수표를 임포트하세요</p>
      </div>
    )
  }

  return (
    <div className="manhour-calendar">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="btn btn-nav">&lt;</button>
        <h3>{selectedYear}년 {selectedMonth + 1}월</h3>
        <button onClick={handleNextMonth} className="btn btn-nav">&gt;</button>
      </div>

      <div className="calendar-worker-select">
        <label>작업자:</label>
        <select
          value={selectedWorkerId || ''}
          onChange={(e) => setSelectedWorkerId(e.target.value)}
        >
          {workers.map(worker => (
            <option key={worker.id} value={worker.id}>
              {worker.personName} ({COST_CATEGORIES.find(c => c.value === worker.costCategory)?.label || '배선'})
            </option>
          ))}
        </select>
        {selectedWorker && (
          <span className="worker-month-total">
            이번달: <strong>{monthTotal.toFixed(1)} M/D</strong>
            ({(monthTotal * selectedWorker.dailyRate).toLocaleString()}원)
          </span>
        )}
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {DAYS_OF_WEEK.map((day, i) => (
            <div key={day} className={`weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}>
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {renderCalendarGrid()}
        </div>
      </div>

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-color md-1"></span> 1.0 (일반)</span>
        <span className="legend-item"><span className="legend-color md-15"></span> 1.5 (연장)</span>
        <span className="legend-item"><span className="legend-color md-2"></span> 2.0+ (철야)</span>
      </div>

      <div className="calendar-month-summary">
        <h4>{selectedMonth + 1}월 공수 요약</h4>
        <table className="summary-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>작업자</th>
              <th>공수</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            {monthSummary.filter(w => w.monthValue > 0).map(worker => (
              <tr
                key={worker.id}
                className={`${worker.id === selectedWorkerId ? 'selected' : ''} category-${worker.costCategory || 'wiring'}`}
                onClick={() => setSelectedWorkerId(worker.id)}
              >
                <td className="category-cell">
                  {COST_CATEGORIES.find(c => c.value === worker.costCategory)?.label || '배선'}
                </td>
                <td>{worker.personName}</td>
                <td className="number">{worker.monthValue.toFixed(1)}</td>
                <td className="number">{(worker.monthValue * worker.dailyRate).toLocaleString()}</td>
              </tr>
            ))}
            {monthSummary.filter(w => w.monthValue > 0).length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">이번 달 공수 데이터가 없습니다</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>합계</td>
              <td className="number">
                {monthSummary.reduce((sum, w) => sum + w.monthValue, 0).toFixed(1)} M/D
              </td>
              <td className="number">
                {monthSummary.reduce((sum, w) => sum + w.monthValue * w.dailyRate, 0).toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default ManHourCalendar
