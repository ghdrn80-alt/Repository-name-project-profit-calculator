import { useRef, useEffect } from 'react'
import { DesignCost } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: DesignCost[]
  onChange: (data: DesignCost[]) => void
}

function DesignCostForm({ data, onChange }: Props) {
  const lastAddedRef = useRef<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const addItem = () => {
    const newItem: DesignCost = {
      id: Date.now().toString(),
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

  const updateItem = (id: string, field: keyof DesignCost, value: string | number) => {
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
    (sum, item) => sum + item.hours * item.hourlyRate,
    0
  )

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>전장설계비</h2>
        <button onClick={addItem} className="btn btn-add">
          + 추가
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-message">설계 인원을 추가하세요</p>
      ) : (
        <table className="data-table" ref={tableRef}>
          <thead>
            <tr>
              <th>담당자</th>
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
                  <input
                    type="text"
                    value={item.personName}
                    onChange={(e) => updateItem(item.id, 'personName', e.target.value)}
                    placeholder="이름"
                  />
                </td>
                <td>
                  <NumberInput
                    value={item.hours}
                    onChange={(val) => updateItem(item.id, 'hours', val)}
                    placeholder="0"
                  />
                </td>
                <td className="manday">
                  {(item.hours / 8).toFixed(1)}
                </td>
                <td>
                  <NumberInput
                    value={item.hourlyRate}
                    onChange={(val) => updateItem(item.id, 'hourlyRate', val)}
                    onTabFromLast={index === data.length - 1 ? addItem : undefined}
                  />
                </td>
                <td className="subtotal">
                  {(item.hours * item.hourlyRate).toLocaleString()}원
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
              <td colSpan={4} className="total-label">전장설계비 합계</td>
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

export default DesignCostForm
