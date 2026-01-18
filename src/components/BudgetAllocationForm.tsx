import { useRef } from 'react'
import { BudgetAllocation } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: BudgetAllocation
  originalEstimate: number  // 원가 견적가 (배분 기준)
  contractAmount: number    // 계약금액 (참고용)
  onChange: (data: BudgetAllocation) => void
}

function BudgetAllocationForm({ data, originalEstimate = 0, contractAmount = 0, onChange }: Props) {
  // 이전 원가 견적가 저장 (비율 유지 재조정용)
  const prevEstimateRef = useRef(originalEstimate || 0)

  const handleChange = (field: keyof BudgetAllocation, value: number) => {
    onChange({ ...data, [field]: value })
  }

  // 금액 합계 계산
  const laborTotal = data.laborDesign + data.laborPanel + data.laborWiring + data.laborSetup + data.laborOther
  const budgetTotal = laborTotal + data.electricalMaterial + data.travelExpense +
    data.outsourcingCost + data.deliveryCost + data.consumableCost + data.overhead

  // 원가 견적가 기준 배분
  const unallocated = originalEstimate - budgetTotal
  const allocationRate = originalEstimate > 0 ? (budgetTotal / originalEstimate) * 100 : 0

  // 비율 계산 (원가 견적가 기준)
  const calcRate = (amount: number) => originalEstimate > 0 ? (amount / originalEstimate * 100).toFixed(1) : '0.0'

  // 비율 유지하면서 금액 재조정
  const adjustByRatio = () => {
    if (prevEstimateRef.current === 0 || budgetTotal === 0) return

    const ratio = originalEstimate / prevEstimateRef.current
    const newData: BudgetAllocation = {
      laborDesign: Math.round(data.laborDesign * ratio),
      laborPanel: Math.round(data.laborPanel * ratio),
      laborWiring: Math.round(data.laborWiring * ratio),
      laborSetup: Math.round(data.laborSetup * ratio),
      laborOther: Math.round(data.laborOther * ratio),
      electricalMaterial: Math.round(data.electricalMaterial * ratio),
      travelExpense: Math.round(data.travelExpense * ratio),
      outsourcingCost: Math.round(data.outsourcingCost * ratio),
      deliveryCost: Math.round(data.deliveryCost * ratio),
      consumableCost: Math.round(data.consumableCost * ratio),
      overhead: Math.round(data.overhead * ratio),
    }
    onChange(newData)
    prevEstimateRef.current = originalEstimate
  }

  // 원가 견적가가 변경되었는지 확인
  const estimateChanged = prevEstimateRef.current !== originalEstimate && prevEstimateRef.current > 0 && budgetTotal > 0

  const laborItems: { key: keyof BudgetAllocation; label: string }[] = [
    { key: 'laborDesign', label: '설계' },
    { key: 'laborPanel', label: '판넬' },
    { key: 'laborWiring', label: '배선' },
    { key: 'laborSetup', label: '셋업' },
    { key: 'laborOther', label: '기타' },
  ]

  const otherItems: { key: keyof BudgetAllocation; label: string }[] = [
    { key: 'electricalMaterial', label: '전기 자재비' },
    { key: 'travelExpense', label: '출장 경비' },
    { key: 'outsourcingCost', label: '외주 가공비' },
    { key: 'deliveryCost', label: '운반/포장비' },
    { key: 'consumableCost', label: '소모품비' },
    { key: 'overhead', label: '간접비' },
  ]

  // 네고 차이 계산
  const negotiationDiff = contractAmount - originalEstimate
  const negotiationRate = originalEstimate > 0 ? (negotiationDiff / originalEstimate) * 100 : 0

  return (
    <section className="form-section">
      <h2>견적 배분 (원가 견적가 기준)</h2>

      <div className="budget-summary">
        <div className="budget-info">
          <span className="budget-label">원가 견적가</span>
          <span className="budget-value">{originalEstimate.toLocaleString()}원</span>
        </div>
        <div className="budget-info">
          <span className="budget-label">계약금액</span>
          <span className="budget-value">{contractAmount.toLocaleString()}원</span>
          <span className={`budget-rate ${negotiationDiff < 0 ? 'discount' : negotiationDiff > 0 ? 'increase' : ''}`}>
            ({negotiationDiff >= 0 ? '+' : ''}{negotiationRate.toFixed(1)}%)
          </span>
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

      {estimateChanged && (
        <div className="ratio-adjust-notice">
          <span>원가 견적가가 변경되었습니다.</span>
          <button onClick={adjustByRatio} className="btn btn-ratio-adjust">
            비율 유지하면서 금액 재조정
          </button>
        </div>
      )}

      <div className="allocation-section">
        <h3 className="allocation-section-title">
          인건비 (소계: {laborTotal.toLocaleString()}원, {calcRate(laborTotal)}%)
        </h3>
        <div className="allocation-grid">
          {laborItems.map((item) => (
            <div className="form-group allocation-item" key={item.key}>
              <label>{item.label}</label>
              <NumberInput
                value={data[item.key]}
                onChange={(val) => handleChange(item.key, val)}
                placeholder="0"
              />
              <span className="rate-display">({calcRate(data[item.key])}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="allocation-section">
        <h3 className="allocation-section-title">기타 비용</h3>
        <div className="allocation-grid">
          {otherItems.map((item) => (
            <div className="form-group allocation-item" key={item.key}>
              <label>{item.label}</label>
              <NumberInput
                value={data[item.key]}
                onChange={(val) => handleChange(item.key, val)}
                placeholder="0"
              />
              <span className="rate-display">({calcRate(data[item.key])}%)</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BudgetAllocationForm
