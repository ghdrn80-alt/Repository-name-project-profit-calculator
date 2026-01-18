import { useRef, useEffect } from 'react'
import { PanelCostItem } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: PanelCostItem[]
  onChange: (data: PanelCostItem[]) => void
}

const WORK_TYPES = ['가공', '조립', '배선', '마킹', '검수', '기타']

function PanelCostForm({ data, onChange }: Props) {
  const lastAddedRef = useRef<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const addItem = () => {
    const newItem: PanelCostItem = {
      id: Date.now().toString(),
      workType: '배선',
      personName: '',
      hours: 0,
      hourlyRate: 0
    }
    lastAddedRef.current = newItem.id
    onChange([...data, newItem])
  }

  useEffect(() => {
    if (lastAddedRef.current && tableRef.current) {
      const newRow = tableRef.current.querySelector(`tr[data-id="${lastAddedRef.current}"]`)
      const firstInput = newRow?.querySelector('input')
      firstInput?.focus()
      lastAddedRef.current = null
    }
  }, [data.length])

  const updateItem = (id: string, field: keyof PanelCostItem, value: string | number) => {
    onChange(
      data.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const removeItem = (id: string) => {
    onChange(data.filter((item) => item.id !== id))
  }

  const totalCost = data.reduce(
    (sum, item) => sum + (item.hours ?? 0) * (item.hourlyRate ?? 0),
    0
  )

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>판넬 제작비</h2>
        <button onClick={addItem} className="btn btn-add">
          + 추가
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-message">판넬 제작 작업자를 추가하세요</p>
      ) : (
        <table className="data-table" ref={tableRef}>
          <thead>
            <tr>
              <th>작업</th>
              <th>작업자</th>
              <th>시수 (H)</th>
              <th>M/D</th>
              <th>시급 (원/H)</th>
              <th>소계</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id} data-id={item.id}>
                <td>
                  <select
                    value={item.workType ?? '배선'}
                    onChange={(e) => updateItem(item.id, 'workType', e.target.value)}
                  >
                    {WORK_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={item.personName ?? ''}
                    onChange={(e) => updateItem(item.id, 'personName', e.target.value)}
                    placeholder="이름"
                  />
                </td>
                <td>
                  <NumberInput
                    value={item.hours ?? 0}
                    onChange={(val) => updateItem(item.id, 'hours', val)}
                    placeholder="0"
                  />
                </td>
                <td className="manday">
                  {((item.hours ?? 0) / 8).toFixed(1)}
                </td>
                <td>
                  <NumberInput
                    value={item.hourlyRate ?? 0}
                    onChange={(val) => updateItem(item.id, 'hourlyRate', val)}
                    onTabFromLast={index === data.length - 1 ? addItem : undefined}
                  />
                </td>
                <td className="subtotal">
                  {((item.hours ?? 0) * (item.hourlyRate ?? 0)).toLocaleString()}원
                </td>
                <td>
                  <button
                    onClick={() => removeItem(item.id)}
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
              <td colSpan={5} className="total-label">판넬 제작비 합계</td>
              <td colSpan={2} className="total-value">
                {totalCost.toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  )
}

export default PanelCostForm
