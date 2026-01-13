import { useRef, useEffect } from 'react'
import { OutsourcingCost } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: OutsourcingCost[]
  onChange: (data: OutsourcingCost[]) => void
}

function OutsourcingCostForm({ data, onChange }: Props) {
  const lastAddedRef = useRef<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const addItem = () => {
    const newItem: OutsourcingCost = {
      id: Date.now().toString(),
      vendor: '',
      description: '',
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

  const updateItem = (id: string, field: keyof OutsourcingCost, value: string | number) => {
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
        <h2>외주 가공비</h2>
        <button onClick={addItem} className="btn btn-add">
          + 추가
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-message">외주 항목을 추가하세요</p>
      ) : (
        <table className="data-table" ref={tableRef}>
          <thead>
            <tr>
              <th>업체명</th>
              <th>내용</th>
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
                    value={item.vendor}
                    onChange={(e) => updateItem(item.id, 'vendor', e.target.value)}
                    placeholder="업체명"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="작업내용"
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
              <td colSpan={2} className="total-label">외주 가공비 합계</td>
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

export default OutsourcingCostForm
