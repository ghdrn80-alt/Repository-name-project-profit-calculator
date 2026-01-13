import { TravelExpense } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: TravelExpense
  onChange: (data: TravelExpense) => void
}

function TravelExpenseForm({ data, onChange }: Props) {
  const totalCost = data.accommodationCost + data.mealCost + data.transportCost

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>출장 경비</h2>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>숙박비</label>
          <NumberInput
            value={data.accommodationCost}
            onChange={(val) => onChange({ ...data, accommodationCost: val })}
            placeholder="0"
          />
        </div>
        <div className="form-group">
          <label>식비</label>
          <NumberInput
            value={data.mealCost}
            onChange={(val) => onChange({ ...data, mealCost: val })}
            placeholder="0"
          />
        </div>
        <div className="form-group">
          <label>교통비</label>
          <NumberInput
            value={data.transportCost}
            onChange={(val) => onChange({ ...data, transportCost: val })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="section-total">
        <span className="total-label">출장 경비 합계</span>
        <span className="total-value">{totalCost.toLocaleString()}원</span>
      </div>
    </section>
  )
}

export default TravelExpenseForm
