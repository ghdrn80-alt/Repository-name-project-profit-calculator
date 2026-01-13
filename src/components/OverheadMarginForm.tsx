import { OverheadAndMargin } from '../types'

interface Props {
  data: OverheadAndMargin
  onChange: (data: OverheadAndMargin) => void
}

function OverheadMarginForm({ data, onChange }: Props) {
  return (
    <section className="form-section">
      <div className="section-header">
        <h2>간접비 및 목표 마진</h2>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>공통 관리비율 (%)</label>
          <input
            type="number"
            value={data.overheadRate ?? ''}
            onChange={(e) => onChange({ ...data, overheadRate: Number(e.target.value) })}
            placeholder="10"
            min="0"
            max="100"
            step="0.1"
          />
          <span className="form-hint">임대료, 전기료, 사무실 운영비 분담</span>
        </div>
        <div className="form-group">
          <label>하자보수 예비비율 (%)</label>
          <input
            type="number"
            value={data.warrantyReserveRate ?? ''}
            onChange={(e) => onChange({ ...data, warrantyReserveRate: Number(e.target.value) })}
            placeholder="3"
            min="0"
            max="100"
            step="0.1"
          />
          <span className="form-hint">A/S 유보금 (보통 3~5%)</span>
        </div>
        <div className="form-group">
          <label>목표 마진율 (%)</label>
          <input
            type="number"
            value={data.marginRate ?? ''}
            onChange={(e) => onChange({ ...data, marginRate: Number(e.target.value) })}
            placeholder="15"
            min="0"
            max="100"
            step="0.1"
          />
          <span className="form-hint">목표 이익률 (매출 대비)</span>
        </div>
      </div>
    </section>
  )
}

export default OverheadMarginForm
