import { ProfitSummary } from '../types'

interface Props {
  summary: ProfitSummary
}

const CATEGORY_LABELS: Record<string, string> = {
  design: '설계',
  panel: '판넬',
  wiring: '배선',
  setup: '셋업',
  other: '기타'
}

function ProfitDashboard({ summary }: Props) {
  const isProfitable = summary.profit >= 0
  const isAboveTarget = summary.marginDifference >= 0

  // 견적 vs 계약 비교
  const originalEstimate = summary.originalEstimate || 0
  const negotiationDiff = summary.totalRevenue - originalEstimate
  const negotiationRate = originalEstimate > 0
    ? (negotiationDiff / originalEstimate) * 100
    : 0
  const isDiscount = negotiationDiff < 0

  const costItems = [
    { label: '인건비 (공수)', value: summary.laborCostTotal },
    { label: '전기 자재비', value: summary.electricalMaterialTotal },
    { label: '출장 경비', value: summary.travelExpenseTotal },
    { label: '외주 가공비', value: summary.outsourcingCostTotal },
    { label: '운반/포장비', value: summary.deliveryCostTotal },
    { label: '소모품비', value: summary.consumableCostTotal },
    { label: '공통 관리비', value: summary.overheadCost },
    { label: '하자보수 예비비', value: summary.warrantyReserveCost },
  ]

  // 인건비 항목별 내역
  const laborByCategory = Object.entries(summary.laborCostByCategory || {})
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      label: CATEGORY_LABELS[key] || key,
      value
    }))

  return (
    <section className="dashboard">
      <h2>손익 현황</h2>

      {/* 견적 vs 계약 비교 섹션 */}
      {originalEstimate > 0 && (
        <div className="estimate-comparison">
          <h3>견적 vs 계약 비교</h3>
          <div className="comparison-grid">
            <div className="comparison-item">
              <span className="comparison-label">원가 견적가</span>
              <span className="comparison-value">{originalEstimate.toLocaleString()}원</span>
            </div>
            <div className="comparison-item">
              <span className="comparison-label">계약금액</span>
              <span className="comparison-value">{summary.totalRevenue.toLocaleString()}원</span>
            </div>
            <div className={`comparison-item highlight ${isDiscount ? 'discount' : 'increase'}`}>
              <span className="comparison-label">{isDiscount ? '네고 할인' : '네고 증액'}</span>
              <span className="comparison-value">
                {isDiscount ? '' : '+'}{negotiationDiff.toLocaleString()}원
                <span className="comparison-rate">
                  ({isDiscount ? '' : '+'}{negotiationRate.toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="summary-cards">
        <div className="card revenue">
          <div className="card-label">계약금액 (매출)</div>
          <div className="card-value">{summary.totalRevenue.toLocaleString()}원</div>
        </div>

        <div className="card cost">
          <div className="card-label">총 비용</div>
          <div className="card-value">{summary.totalCost.toLocaleString()}원</div>
        </div>

        <div className={`card profit ${isProfitable ? 'positive' : 'negative'}`}>
          <div className="card-label">{isProfitable ? '이익' : '손실'}</div>
          <div className="card-value">
            {isProfitable ? '' : '-'}{Math.abs(summary.profit).toLocaleString()}원
          </div>
          <div className="card-rate">
            이익률: {summary.profitRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className={`margin-status ${isAboveTarget ? 'above' : 'below'}`}>
        <span className="margin-label">목표 마진율 대비</span>
        <span className="margin-value">
          {isAboveTarget ? '+' : ''}{summary.marginDifference.toFixed(1)}%p
        </span>
        <span className="margin-target">(목표: {summary.targetMargin}%)</span>
      </div>

      <div className="productivity-section">
        <h3>인당 생산성 지표</h3>
        <div className="productivity-grid">
          <div className="productivity-item">
            <span className="productivity-label">투입 인원</span>
            <span className="productivity-value">{summary.totalPersonnel}명</span>
          </div>
          <div className="productivity-item">
            <span className="productivity-label">예상 공수</span>
            <span className="productivity-value">{summary.estimatedManHours.toLocaleString()} M/H</span>
          </div>
          <div className="productivity-item highlight">
            <span className="productivity-label">인당 매출액</span>
            <span className="productivity-value">
              {summary.revenuePerPerson > 0 ? Math.round(summary.revenuePerPerson).toLocaleString() : '-'}원
            </span>
          </div>
          <div className="productivity-item highlight">
            <span className="productivity-label">인당 부가가치</span>
            <span className="productivity-value">
              {summary.valueAddedPerPerson > 0 ? Math.round(summary.valueAddedPerPerson).toLocaleString() : '-'}원
            </span>
          </div>
          <div className="productivity-item highlight">
            <span className="productivity-label">공수 대비 효율</span>
            <span className="productivity-value">
              {summary.efficiencyPerManHour > 0 ? Math.round(summary.efficiencyPerManHour).toLocaleString() : '-'}원/M/H
            </span>
          </div>
        </div>
      </div>

      <div className="cost-breakdown">
        <h3>비용 상세</h3>
        {costItems.map((item) => (
          <div className="breakdown-item" key={item.label}>
            <span className="label">{item.label}</span>
            <span className="value">{item.value.toLocaleString()}원</span>
            <span className="percent">
              ({summary.totalCost > 0
                ? ((item.value / summary.totalCost) * 100).toFixed(1)
                : 0}%)
            </span>
          </div>
        ))}
        <div className="breakdown-item total">
          <span className="label">직접비 소계</span>
          <span className="value">{summary.directCostSubtotal.toLocaleString()}원</span>
          <span className="percent"></span>
        </div>
      </div>

      {laborByCategory.length > 0 && (
        <div className="cost-breakdown">
          <h3>인건비 항목별 내역</h3>
          {laborByCategory.map((item) => (
            <div className="breakdown-item" key={item.label}>
              <span className="label">{item.label}</span>
              <span className="value">{item.value.toLocaleString()}원</span>
              <span className="percent">
                ({summary.laborCostTotal > 0
                  ? ((item.value / summary.laborCostTotal) * 100).toFixed(1)
                  : 0}%)
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="profit-bar">
        <div className="bar-container">
          <div
            className="bar-fill revenue-bar"
            style={{ width: '100%' }}
          >
            매출
          </div>
        </div>
        <div className="bar-container">
          <div
            className="bar-fill cost-bar"
            style={{
              width: summary.totalRevenue > 0
                ? `${Math.min((summary.totalCost / summary.totalRevenue) * 100, 100)}%`
                : '0%'
            }}
          >
            비용 {summary.totalRevenue > 0
              ? `(${((summary.totalCost / summary.totalRevenue) * 100).toFixed(1)}%)`
              : ''}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProfitDashboard
