import { useState, useCallback, useEffect } from 'react'
import { ProjectData, ProfitSummary, CostComparison, EmployeeMaster } from './types'
import ProjectInfoForm from './components/ProjectInfoForm'
import ElectricalMaterialForm from './components/ElectricalMaterialForm'
import TravelExpenseForm from './components/TravelExpenseForm'
import OutsourcingCostForm from './components/OutsourcingCostForm'
import DeliveryCostForm from './components/DeliveryCostForm'
import ConsumableCostForm from './components/ConsumableCostForm'
import OverheadMarginForm from './components/OverheadMarginForm'
import BudgetAllocationForm from './components/BudgetAllocationForm'
import ProfitDashboard from './components/ProfitDashboard'
import CostComparisonDashboard from './components/CostComparisonDashboard'
import ManHourCostForm from './components/ManHourCostForm'
import EmployeeMasterForm from './components/EmployeeMasterForm'
import { exportToExcel } from './utils/excelExport'
import { calculateManHourTotal, calculateAllManHourByCategory } from './utils/manHourImport'
import {
  loadEmployeeMaster,
  saveEmployeeMaster,
  addEmployee,
  updateEmployee,
  removeEmployee
} from './utils/employeeMaster'

const initialData: ProjectData = {
  projectInfo: {
    projectName: '',
    clientName: '',
    originalEstimate: 0,
    contractAmount: 0,
    totalPersonnel: 0,
    estimatedManHours: 0
  },
  electricalMaterials: [],
  travelExpense: {
    accommodationCost: 0,
    mealCost: 0,
    transportCost: 0
  },
  outsourcingCosts: [],
  deliveryCost: {
    shippingCost: 0,
    packagingCost: 0
  },
  consumableCosts: [],
  overheadAndMargin: {
    overheadRate: 10,
    warrantyReserveRate: 3,
    marginRate: 15
  },
  budgetAllocation: {
    laborDesign: 0,
    laborPanel: 0,
    laborWiring: 0,
    laborSetup: 0,
    laborOther: 0,
    electricalMaterial: 0,
    travelExpense: 0,
    outsourcingCost: 0,
    deliveryCost: 0,
    consumableCost: 0,
    overhead: 0
  },
  manHourCost: {
    internalWorkers: [],
    externalWorkers: []
  }
}

function App() {
  const [data, setData] = useState<ProjectData>(initialData)
  const [employeeMaster, setEmployeeMaster] = useState<EmployeeMaster[]>([])
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // 상태 메시지 표시 (3초 후 자동 사라짐)
  const showStatus = (message: string) => {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // 초기 로드 시 localStorage에서 직원 목록 불러오기
  useEffect(() => {
    setEmployeeMaster(loadEmployeeMaster())
  }, [])

  // 직원 추가
  const handleAddEmployee = (employee: Omit<EmployeeMaster, 'id'>) => {
    setEmployeeMaster((prev) => addEmployee(prev, employee))
  }

  // 직원 수정
  const handleUpdateEmployee = (id: string, updates: Partial<Omit<EmployeeMaster, 'id'>>) => {
    setEmployeeMaster((prev) => updateEmployee(prev, id, updates))
  }

  // 직원 삭제
  const handleRemoveEmployee = (id: string) => {
    setEmployeeMaster((prev) => removeEmployee(prev, id))
  }

  const calculateSummary = useCallback((): ProfitSummary => {
    const originalEstimate = data.projectInfo.originalEstimate
    const totalRevenue = data.projectInfo.contractAmount

    // 인건비 계산 (공수 통합)
    const laborCostByCategory = calculateAllManHourByCategory(data.manHourCost)
    const laborCostTotal = calculateManHourTotal(data.manHourCost)

    const electricalMaterialTotal = data.electricalMaterials.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0
    )

    const travelExpenseTotal =
      data.travelExpense.accommodationCost +
      data.travelExpense.mealCost +
      data.travelExpense.transportCost

    const outsourcingCostTotal = data.outsourcingCosts.reduce(
      (sum, item) => sum + item.amount, 0
    )

    const deliveryCostTotal = data.deliveryCost.shippingCost + data.deliveryCost.packagingCost

    const consumableCostTotal = data.consumableCosts.reduce(
      (sum, item) => sum + item.amount, 0
    )

    // 직접비 소계
    const directCostSubtotal = laborCostTotal + electricalMaterialTotal +
      travelExpenseTotal + outsourcingCostTotal + deliveryCostTotal + consumableCostTotal

    // 간접비 계산
    const overheadCost = directCostSubtotal * (data.overheadAndMargin.overheadRate / 100)
    const warrantyReserveCost = totalRevenue * (data.overheadAndMargin.warrantyReserveRate / 100)
    const indirectCostSubtotal = overheadCost + warrantyReserveCost

    // 총 비용 및 손익
    const totalCost = directCostSubtotal + indirectCostSubtotal
    const profit = totalRevenue - totalCost
    const profitRate = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const targetMargin = data.overheadAndMargin.marginRate
    const marginDifference = profitRate - targetMargin

    // 견적 배분 비교 (금액 기반)
    const ba = data.budgetAllocation
    const laborBudgetTotal = ba.laborDesign + ba.laborPanel + ba.laborWiring + ba.laborSetup + ba.laborOther
    const budgetTotal = laborBudgetTotal + ba.electricalMaterial + ba.travelExpense +
      ba.outsourcingCost + ba.deliveryCost + ba.consumableCost + ba.overhead
    const unallocated = totalRevenue - budgetTotal

    const createComparison = (label: string, budget: number, actual: number): CostComparison => {
      const difference = budget - actual
      let status: 'under' | 'over' | 'match' = 'match'
      if (difference > 0) status = 'under'
      else if (difference < 0) status = 'over'
      return { label, budget, actual, difference, status }
    }

    const costComparisons: CostComparison[] = [
      createComparison('인건비 - 설계', ba.laborDesign, laborCostByCategory.design || 0),
      createComparison('인건비 - 판넬', ba.laborPanel, laborCostByCategory.panel || 0),
      createComparison('인건비 - 배선', ba.laborWiring, laborCostByCategory.wiring || 0),
      createComparison('인건비 - 셋업', ba.laborSetup, laborCostByCategory.setup || 0),
      createComparison('인건비 - 기타', ba.laborOther, laborCostByCategory.other || 0),
      createComparison('전기 자재비', ba.electricalMaterial, electricalMaterialTotal),
      createComparison('출장 경비', ba.travelExpense, travelExpenseTotal),
      createComparison('외주 가공비', ba.outsourcingCost, outsourcingCostTotal),
      createComparison('운반/포장비', ba.deliveryCost, deliveryCostTotal),
      createComparison('소모품비', ba.consumableCost, consumableCostTotal),
      createComparison('간접비', ba.overhead, indirectCostSubtotal),
    ]

    // 인당 생산성 지표 계산
    const totalPersonnel = data.projectInfo.totalPersonnel
    const estimatedManHours = data.projectInfo.estimatedManHours
    const revenuePerPerson = totalPersonnel > 0 ? totalRevenue / totalPersonnel : 0
    const valueAddedPerPerson = totalPersonnel > 0 ? (totalRevenue - directCostSubtotal) / totalPersonnel : 0
    const efficiencyPerManHour = estimatedManHours > 0 ? totalRevenue / estimatedManHours : 0

    return {
      originalEstimate,
      totalRevenue,
      laborCostTotal,
      laborCostByCategory,
      electricalMaterialTotal,
      travelExpenseTotal,
      outsourcingCostTotal,
      deliveryCostTotal,
      consumableCostTotal,
      directCostSubtotal,
      overheadCost,
      warrantyReserveCost,
      indirectCostSubtotal,
      totalCost,
      profit,
      profitRate,
      targetMargin,
      marginDifference,
      budgetTotal,
      unallocated,
      costComparisons,
      totalPersonnel,
      estimatedManHours,
      revenuePerPerson,
      valueAddedPerPerson,
      efficiencyPerManHour
    }
  }, [data])

  const handleExport = async () => {
    await exportToExcel(data, calculateSummary())
  }

  const handleReset = () => {
    if (window.confirm('모든 데이터를 초기화하시겠습니까?')) {
      setData(initialData)
      setCurrentFileName(null)
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI) {
      alert('저장 기능은 데스크톱 앱에서만 사용 가능합니다.')
      return
    }

    // 프로젝트 데이터 + 직원 마스터 함께 저장
    const saveData = {
      ...data,
      employeeMaster: employeeMaster
    }
    const result = await window.electronAPI.saveProject(JSON.stringify(saveData, null, 2))
    if (result.success) {
      if (result.filePath) {
        const fileName = result.filePath.split(/[/\\]/).pop() || result.filePath
        setCurrentFileName(fileName)
      }
      showStatus('프로젝트가 저장되었습니다.')
    } else if (!result.canceled) {
      showStatus('저장 실패: ' + result.error)
    }
  }

  const handleLoad = async () => {
    if (!window.electronAPI) {
      alert('불러오기 기능은 데스크톱 앱에서만 사용 가능합니다.')
      return
    }

    const result = await window.electronAPI.loadProject()
    if (result.success && result.data) {
      try {
        const loadedData = JSON.parse(result.data)

        // 이전 데이터 형식 호환성 처리
        // 레거시 budgetAllocation 마이그레이션 (laborCost → 세부 항목)
        const legacyBudget = loadedData.budgetAllocation
        const migratedBudgetAllocation = {
          ...initialData.budgetAllocation,
          ...loadedData.budgetAllocation,
          // 레거시 laborCost가 있고 새 필드가 없으면 배선으로 마이그레이션
          laborWiring: legacyBudget?.laborWiring ?? legacyBudget?.laborCost ?? 0,
        }

        const migratedData: ProjectData = {
          ...initialData,
          ...loadedData,
          projectInfo: { ...initialData.projectInfo, ...loadedData.projectInfo },
          electricalMaterials: loadedData.electricalMaterials ?? [],
          travelExpense: { ...initialData.travelExpense, ...loadedData.travelExpense },
          outsourcingCosts: loadedData.outsourcingCosts ?? [],
          deliveryCost: { ...initialData.deliveryCost, ...loadedData.deliveryCost },
          consumableCosts: loadedData.consumableCosts ?? [],
          overheadAndMargin: { ...initialData.overheadAndMargin, ...loadedData.overheadAndMargin },
          budgetAllocation: migratedBudgetAllocation,
          manHourCost: {
            internalWorkers: loadedData.manHourCost?.internalWorkers ?? [],
            externalWorkers: loadedData.manHourCost?.externalWorkers ?? loadedData.manHourCost?.workers ?? [],
            sourceFile: loadedData.manHourCost?.sourceFile,
            importedAt: loadedData.manHourCost?.importedAt
          },
        }

        setData(migratedData)

        // 직원 마스터 데이터도 불러오기
        if (loadedData.employeeMaster && Array.isArray(loadedData.employeeMaster)) {
          setEmployeeMaster(loadedData.employeeMaster)
          saveEmployeeMaster(loadedData.employeeMaster)  // localStorage에도 저장
        }

        if (result.filePath) {
          const fileName = result.filePath.split(/[/\\]/).pop() || result.filePath
          setCurrentFileName(fileName)
        }
        showStatus('프로젝트를 불러왔습니다.')
      } catch {
        showStatus('파일 형식이 올바르지 않습니다.')
      }
    } else if (!result.canceled) {
      showStatus('불러오기 실패: ' + result.error)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <h1>프로젝트 손익계산기</h1>
          {currentFileName && (
            <span className="current-file">{currentFileName}</span>
          )}
          {statusMessage && (
            <span className="status-message">{statusMessage}</span>
          )}
        </div>
        <div className="header-actions">
          <button onClick={() => setShowEmployeeModal(true)} className="btn btn-employee">
            직원 관리
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            저장
          </button>
          <button onClick={handleLoad} className="btn btn-primary">
            불러오기
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            Excel 내보내기
          </button>
          <button onClick={handleReset} className="btn btn-secondary">
            초기화
          </button>
        </div>
      </header>

      {/* 직원 관리 모달 */}
      <EmployeeMasterForm
        employees={employeeMaster}
        onAdd={handleAddEmployee}
        onUpdate={handleUpdateEmployee}
        onRemove={handleRemoveEmployee}
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
      />

      <main className="main-content">
        <div className="forms-container">
          <ProjectInfoForm
            data={data.projectInfo}
            onChange={(projectInfo) => setData({ ...data, projectInfo })}
          />
          <ManHourCostForm
            data={data.manHourCost}
            onChange={(manHourCost) => setData({ ...data, manHourCost })}
            employees={employeeMaster}
          />
          <ElectricalMaterialForm
            data={data.electricalMaterials}
            onChange={(electricalMaterials) => setData({ ...data, electricalMaterials })}
          />
          <TravelExpenseForm
            data={data.travelExpense}
            onChange={(travelExpense) => setData({ ...data, travelExpense })}
          />
          <OutsourcingCostForm
            data={data.outsourcingCosts}
            onChange={(outsourcingCosts) => setData({ ...data, outsourcingCosts })}
          />
          <DeliveryCostForm
            data={data.deliveryCost}
            onChange={(deliveryCost) => setData({ ...data, deliveryCost })}
          />
          <ConsumableCostForm
            data={data.consumableCosts}
            onChange={(consumableCosts) => setData({ ...data, consumableCosts })}
          />
          <OverheadMarginForm
            data={data.overheadAndMargin}
            onChange={(overheadAndMargin) => setData({ ...data, overheadAndMargin })}
          />
          <BudgetAllocationForm
            data={data.budgetAllocation}
            originalEstimate={data.projectInfo.originalEstimate}
            contractAmount={data.projectInfo.contractAmount}
            onChange={(budgetAllocation) => setData({ ...data, budgetAllocation })}
          />
        </div>

        <div className="dashboard-container">
          <ProfitDashboard summary={calculateSummary()} />
          <CostComparisonDashboard summary={calculateSummary()} />
        </div>
      </main>
    </div>
  )
}

export default App
