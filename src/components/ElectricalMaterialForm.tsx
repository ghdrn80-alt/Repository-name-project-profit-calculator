import { useRef, useEffect } from 'react'
import { ElectricalMaterial } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: ElectricalMaterial[]
  onChange: (data: ElectricalMaterial[]) => void
}

const CATEGORIES = ['PLC', '감지기', '차단기', '케이블', '단자대', '릴레이', '기타']

function ElectricalMaterialForm({ data, onChange }: Props) {
  const lastAddedRef = useRef<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const addItem = () => {
    const newItem: ElectricalMaterial = {
      id: Date.now().toString(),
      category: 'PLC',
      itemName: '',
      quantity: 0,
      unitPrice: 0
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

  const updateItem = (id: string, field: keyof ElectricalMaterial, value: string | number) => {
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
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>전기 자재비</h2>
        <button onClick={addItem} className="btn btn-add">
          + 추가
        </button>
      </div>

      {data.length === 0 ? (
        <p className="empty-message">자재 항목을 추가하세요</p>
      ) : (
        <table className="data-table" ref={tableRef}>
          <thead>
            <tr>
              <th>분류</th>
              <th>품목명</th>
              <th>수량</th>
              <th>단가</th>
              <th>소계</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id} data-id={item.id}>
                <td>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </td>
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
                    value={item.quantity}
                    onChange={(val) => updateItem(item.id, 'quantity', val)}
                    placeholder="0"
                  />
                </td>
                <td>
                  <NumberInput
                    value={item.unitPrice}
                    onChange={(val) => updateItem(item.id, 'unitPrice', val)}
                    onTabFromLast={index === data.length - 1 ? addItem : undefined}
                  />
                </td>
                <td className="subtotal">
                  {(item.quantity * item.unitPrice).toLocaleString()}원
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
              <td colSpan={4} className="total-label">전기 자재비 합계</td>
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

export default ElectricalMaterialForm
