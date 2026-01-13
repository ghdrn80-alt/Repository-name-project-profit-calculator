import { useState } from 'react'
import { ProfitSummary } from '../types'

interface Props {
  summary: ProfitSummary
}

function CostComparisonDashboard({ summary }: Props) {
  const [showTable, setShowTable] = useState(false)

  const hasBudget = summary.budgetTotal > 0
  const totalBudgetDiff = summary.budgetTotal - summary.totalCost
  const overBudgetCount = summary.costComparisons.filter(c => c.status === 'over').length
  const underBudgetCount = summary.costComparisons.filter(c => c.status === 'under').length

  // 그래프에서 사용할 최대값 계산
  const maxValue = Math.max(
    ...summary.costComparisons.map(c => Math.max(c.budget, c.actual))
  )

  const getBarWidth = (value: number) => {
    if (maxValue === 0) return 0
    return Math.min((value / maxValue) * 100, 100)
  }

  return (
    <section className="dashboard comparison-dashboard">
      <h2>견적 비교분석</h2>

      {!hasBudget ? (
        <div className="empty-message">
          견적 배분을 입력하면 비교분석 결과가 표시됩니다.
        </div>
      ) : (
        <>
          <div className="comparison-summary">
            <div className={`comparison-card ${totalBudgetDiff >= 0 ? 'positive' : 'negative'}`}>
              <div className="comparison-label">전체 예산 대비</div>
              <div className="comparison-value">
                {totalBudgetDiff >= 0 ? '+' : ''}{totalBudgetDiff.toLocaleString()}원
              </div>
              <div className="comparison-status">
                {totalBudgetDiff >= 0 ? '예산 내 집행' : '예산 초과'}
              </div>
            </div>
            <div className="comparison-stats">
              <div className="stat under">
                <span className="stat-value">{underBudgetCount}</span>
                <span className="stat-label">절감 항목</span>
              </div>
              <div className="stat over">
                <span className="stat-value">{overBudgetCount}</span>
                <span className="stat-label">초과 항목</span>
              </div>
            </div>
          </div>

          {summary.unallocated !== 0 && (
            <div className={`unallocated-warning ${summary.unallocated > 0 ? 'under' : 'over'}`}>
              {summary.unallocated > 0
                ? `미배분 금액: ${summary.unallocated.toLocaleString()}원`
                : `초과 배분: ${Math.abs(summary.unallocated).toLocaleString()}원`}
            </div>
          )}

          {/* 바 차트 그래프 */}
          <div className="comparison-chart">
            <div className="chart-legend">
              <span className="legend-item budget">
                <span className="legend-color"></span>배분금액
              </span>
              <span className="legend-item actual">
                <span className="legend-color"></span>실제원가
              </span>
            </div>

            {summary.costComparisons.map((item) => (
              <div key={item.label} className={`chart-row ${item.status}`}>
                <div className="chart-label">{item.label}</div>
                <div className="chart-bars">
                  <div className="bar-container">
                    <div
                      className="bar budget-bar"
                      style={{ width: `${getBarWidth(item.budget)}%` }}
                    >
                      <span className="bar-value">{item.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bar-container">
                    <div
                      className={`bar actual-bar ${item.status}`}
                      style={{ width: `${getBarWidth(item.actual)}%` }}
                    >
                      <span className="bar-value">{item.actual.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className={`chart-diff ${item.difference >= 0 ? 'positive' : 'negative'}`}>
                  {item.difference >= 0 ? '+' : ''}{item.difference.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* 테이블 토글 버튼 */}
          <button
            className="btn btn-toggle-table"
            onClick={() => setShowTable(!showTable)}
          >
            {showTable ? '상세 테이블 숨기기' : '상세 테이블 보기'}
          </button>

          {/* 상세 테이블 */}
          {showTable && (
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>배분금액</th>
                  <th>실제원가</th>
                  <th>차이</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {summary.costComparisons.map((item) => (
                  <tr key={item.label} className={item.status}>
                    <td>{item.label}</td>
                    <td className="number">{item.budget.toLocaleString()}</td>
                    <td className="number">{item.actual.toLocaleString()}</td>
                    <td className={`number ${item.difference >= 0 ? 'positive' : 'negative'}`}>
                      {item.difference >= 0 ? '+' : ''}{item.difference.toLocaleString()}
                    </td>
                    <td className="status-cell">
                      {item.status === 'under' && <span className="status-badge under">절감</span>}
                      {item.status === 'over' && <span className="status-badge over">초과</span>}
                      {item.status === 'match' && <span className="status-badge match">일치</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="total-label">합계</td>
                  <td className="number">{summary.budgetTotal.toLocaleString()}</td>
                  <td className="number">{summary.totalCost.toLocaleString()}</td>
                  <td className={`number ${totalBudgetDiff >= 0 ? 'positive' : 'negative'}`}>
                    {totalBudgetDiff >= 0 ? '+' : ''}{totalBudgetDiff.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </>
      )}
    </section>
  )
}

export default CostComparisonDashboard
