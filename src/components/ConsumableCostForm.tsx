import { useRef, useEffect } from 'react'
import { ConsumableCost } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: ConsumableCost[]
  onChange: (data: ConsumableCost[]) => void
}

function ConsumableCostForm({ data, onChange }: Props) {
  const lastAddedRef = useRef<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const addItem = () => {
    const newItem: ConsumableCost = {
      id: Date.now().toString(),
      itemName: '',
      amount: 0
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

  const updateItem = (id: string, field: keyof ConsumableCost, value: string | number) => {
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
    (sum, item) => sum + item.amount,
    0
  )

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>소모품비</h2>
        <button onClick={addItem} className="btn btn-add">
          + 추가
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-message">소모품 항목을 추가하세요 (테이프, 튜브, 명판 등)</p>
      ) : (
        <table className="data-table" ref={tableRef}>
          <thead>
            <tr>
              <th>품목명</th>
              <th>금액</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id} data-id={item.id}>
                <td>
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                    placeholder="품목명"
                  />
                </td>
                <td>
                  <NumberInput
                    value={item.amount}
                    onChange={(val) => updateItem(item.id, 'amount', val)}
                    onTabFromLast={index === data.length - 1 ? addItem : undefined}
                  />
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
              <td className="total-label">소모품비 합계</td>
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

export default ConsumableCostForm
