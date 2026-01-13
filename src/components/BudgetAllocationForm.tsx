import { BudgetAllocation } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: BudgetAllocation
  contractAmount: number
  onChange: (data: BudgetAllocation) => void
}

function BudgetAllocationForm({ data, contractAmount, onChange }: Props) {
  const handleChange = (field: keyof BudgetAllocation, value: number) => {
    onChange({ ...data, [field]: value })
  }

  const budgetTotal = data.designCost + data.electricalMaterial + data.panelCost +
    data.wiringCost + data.travelExpense + data.setupCost + data.outsourcingCost +
    data.deliveryCost + data.consumableCost + data.overhead + (data.manHourCost || 0)

  const unallocated = contractAmount - budgetTotal
  const allocationRate = contractAmount > 0 ? (budgetTotal / contractAmount) * 100 : 0

  const items: { key: keyof BudgetAllocation; label: string }[] = [
    { key: 'designCost', label: '전장설계비 (공수 포함)' },
    { key: 'electricalMaterial', label: '전기 자재비' },
    { key: 'panelCost', label: '판넬 제작비 (공수 포함)' },
    { key: 'wiringCost', label: '기체 배선비 (공수 포함)' },
    { key: 'travelExpense', label: '출장 경비' },
    { key: 'setupCost', label: '시운전/셋업 (공수 포함)' },
    { key: 'outsourcingCost', label: '외주 가공비' },
    { key: 'deliveryCost', label: '운반/포장비' },
    { key: 'consumableCost', label: '소모품비' },
    { key: 'manHourCost', label: '기타 공수' },
    { key: 'overhead', label: '간접비' },
  ]

  return (
    <section className="form-section">
      <h2>견적 배분</h2>

      <div className="budget-summary">
        <div className="budget-info">
          <span className="budget-label">계약금액</span>
          <span className="budget-value">{contractAmount.toLocaleString()}원</span>
        </div>
        <div className="budget-info">
          <span className="budget-label">배분 합계</span>
          <span className="budget-value">{budgetTotal.toLocaleString()}원</span>
          <span className="budget-rate">({allocationRate.toFixed(1)}%)</span>
        </div>
        <div className={`budget-info ${unallocated < 0 ? 'over' : unallocated > 0 ? 'under' : ''}`}>
          <span className="budget-label">{unallocated >= 0 ? '미배분' : '초과배분'}</span>
          <span className="budget-value">{Math.abs(unallocated).toLocaleString()}원</span>
        </div>
      </div>

      <div className="allocation-grid">
        {items.map((item) => (
          <div className="form-group" key={item.key}>
            <label>{item.label}</label>
            <NumberInput
              value={data[item.key]}
              onChange={(val) => handleChange(item.key, val)}
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default BudgetAllocationForm
