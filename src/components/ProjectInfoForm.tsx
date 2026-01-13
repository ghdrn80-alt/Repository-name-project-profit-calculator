import { ProjectInfo } from '../types'
import NumberInput from './NumberInput'

interface Props {
  data: ProjectInfo
  onChange: (data: ProjectInfo) => void
}

function ProjectInfoForm({ data, onChange }: Props) {
  const handleChange = (field: keyof ProjectInfo, value: string | number) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <section className="form-section">
      <h2>프로젝트 정보</h2>
      <div className="form-grid">
        <div className="form-group">
          <label>프로젝트명</label>
          <input
            type="text"
            value={data.projectName ?? ''}
            onChange={(e) => handleChange('projectName', e.target.value)}
            placeholder="프로젝트명 입력"
          />
        </div>
        <div className="form-group">
          <label>고객사</label>
          <input
            type="text"
            value={data.clientName ?? ''}
            onChange={(e) => handleChange('clientName', e.target.value)}
            placeholder="고객사명 입력"
          />
        </div>
        <div className="form-group">
          <label>계약금액 (원)</label>
          <NumberInput
            value={data.contractAmount}
            onChange={(val) => handleChange('contractAmount', val)}
            placeholder="0"
          />
        </div>
        <div className="form-group">
          <label>총 투입 인원 (명)</label>
          <NumberInput
            value={data.totalPersonnel}
            onChange={(val) => handleChange('totalPersonnel', val)}
            placeholder="0"
            min={0}
          />
        </div>
        <div className="form-group">
          <label>예상 공수 (M/H)</label>
          <div className="input-with-manday">
            <NumberInput
              value={data.estimatedManHours}
              onChange={(val) => handleChange('estimatedManHours', val)}
              placeholder="0"
              min={0}
            />
            <span className="manday-display">
              {((data.estimatedManHours ?? 0) / 8).toFixed(1)} M/D
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProjectInfoForm
