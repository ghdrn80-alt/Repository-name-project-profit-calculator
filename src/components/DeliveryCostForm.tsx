import { DeliveryCost } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: DeliveryCost
  onChange: (data: DeliveryCost) => void
}

function DeliveryCostForm({ data, onChange }: Props) {
  const totalCost = data.shippingCost + data.packagingCost

  return (
    <section className="form-section">
      <div className="section-header">
        <h2>운반비 및 포장비</h2>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>운반비</label>
          <NumberInput
            value={data.shippingCost}
            onChange={(val) => onChange({ ...data, shippingCost: val })}
            placeholder="0"
          />
        </div>
        <div className="form-group">
          <label>포장비</label>
          <NumberInput
            value={data.packagingCost}
            onChange={(val) => onChange({ ...data, packagingCost: val })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="section-total">
        <span className="total-label">운반/포장비 합계</span>
        <span className="total-value">{totalCost.toLocaleString()}원</span>
      </div>
    </section>
  )
}

export default DeliveryCostForm
