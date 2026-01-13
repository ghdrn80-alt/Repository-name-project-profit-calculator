import { useState, useCallback } from 'react'
import { ProjectData, ProfitSummary, CostComparison } from './types'
import ProjectInfoForm from './components/ProjectInfoForm'
import DesignCostForm from './components/DesignCostForm'
import ElectricalMaterialForm from './components/ElectricalMaterialForm'
import PanelCostForm from './components/PanelCostForm'
import WiringCostForm from './components/WiringCostForm'
import TravelExpenseForm from './components/TravelExpenseForm'
import SetupCostForm from './components/SetupCostForm'
import OutsourcingCostForm from './components/OutsourcingCostForm'
import DeliveryCostForm from './components/DeliveryCostForm'
import ConsumableCostForm from './components/ConsumableCostForm'
import OverheadMarginForm from './components/OverheadMarginForm'
import BudgetAllocationForm from './components/BudgetAllocationForm'
import ProfitDashboard from './components/ProfitDashboard'
import CostComparisonDashboard from './components/CostComparisonDashboard'
import ManHourCostForm from './components/ManHourCostForm'
import { exportToExcel } from './utils/excelExport'
import { calculateManHourTotal, calculateAllManHourByCategory } from './utils/manHourImport'

const initialData: ProjectData = {
  projectInfo: {
    projectName: '',
    clientName: '',
    contractAmount: 0,
    totalPersonnel: 0,
    estimatedManHours: 0
  },
  designCosts: [],
  electricalMaterials: [],
  panelCosts: [],
  wiringCosts: [],
  travelExpense: {
    accommodationCost: 0,
    mealCost: 0,
    transportCost: 0
  },
  setupCosts: [],
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
    designCost: 0,
    electricalMaterial: 0,
    panelCost: 0,
    wiringCost: 0,
    travelExpense: 0,
    setupCost: 0,
    outsourcingCost: 0,
    deliveryCost: 0,
    consumableCost: 0,
    overhead: 0,
    manHourCost: 0
  },
  manHourCost: {
    workers: []
  }
}

function App() {
  const [data, setData] = useState<ProjectData>(initialData)

  const calculateSummary = useCallback((): ProfitSummary => {
    const totalRevenue = data.projectInfo.contractAmount

    const designCostTotal = data.designCosts.reduce(
      (sum, item) => sum + item.hours * item.hourlyRate, 0
    )

    const electricalMaterialTotal = data.electricalMaterials.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0
    )

    const panelCostTotal = data.panelCosts.reduce(
      (sum, item) => sum + (item.hours ?? 0) * (item.hourlyRate ?? 0), 0
    )

    const wiringCostTotal = data.wiringCosts.reduce(
      (sum, item) => sum + item.hours * item.hourlyRate, 0
    )

    const travelExpenseTotal =
      data.travelExpense.accommodationCost +
      data.travelExpense.mealCost +
      data.travelExpense.transportCost

    const setupCostTotal = data.setupCosts.reduce(
      (sum, item) => sum + item.hours * item.hourlyRate, 0
    )

    const outsourcingCostTotal = data.outsourcingCosts.reduce(
      (sum, item) => sum + item.amount, 0
    )

    const deliveryCostTotal = data.deliveryCost.shippingCost + data.deliveryCost.packagingCost

    const consumableCostTotal = data.consumableCosts.reduce(
      (sum, item) => sum + item.amount, 0
    )

    // 비용 항목별 공수 인건비 계산
    const manHourByCategory = calculateAllManHourByCategory(data.manHourCost)
    const manHourCostTotal = calculateManHourTotal(data.manHourCost)

    // 공수 인건비를 각 비용 항목에 합산
    const designCostWithManHour = designCostTotal + manHourByCategory.design
    const panelCostWithManHour = panelCostTotal + manHourByCategory.panel
    const wiringCostWithManHour = wiringCostTotal + manHourByCategory.wiring
    const setupCostWithManHour = setupCostTotal + manHourByCategory.setup
    const otherManHourCost = manHourByCategory.other  // 기타 공수 인건비 (별도 집계)

    // 직접비 소계 (공수 인건비 포함)
    const directCostSubtotal = designCostWithManHour + electricalMaterialTotal + panelCostWithManHour +
      wiringCostWithManHour + travelExpenseTotal + setupCostWithManHour + outsourcingCostTotal +
      deliveryCostTotal + consumableCostTotal + otherManHourCost

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

    // 견적 배분 비교
    const ba = data.budgetAllocation
    const budgetTotal = ba.designCost + ba.electricalMaterial + ba.panelCost +
      ba.wiringCost + ba.travelExpense + ba.setupCost + ba.outsourcingCost +
      ba.deliveryCost + ba.consumableCost + ba.overhead + ba.manHourCost
    const unallocated = totalRevenue - budgetTotal

    const createComparison = (label: string, budget: number, actual: number): CostComparison => {
      const difference = budget - actual
      let status: 'under' | 'over' | 'match' = 'match'
      if (difference > 0) status = 'under'
      else if (difference < 0) status = 'over'
      return { label, budget, actual, difference, status }
    }

    const costComparisons: CostComparison[] = [
      createComparison('전장설계비', ba.designCost, designCostWithManHour),
      createComparison('전기 자재비', ba.electricalMaterial, electricalMaterialTotal),
      createComparison('판넬 제작비', ba.panelCost, panelCostWithManHour),
      createComparison('기체 배선비', ba.wiringCost, wiringCostWithManHour),
      createComparison('출장 경비', ba.travelExpense, travelExpenseTotal),
      createComparison('시운전/셋업', ba.setupCost, setupCostWithManHour),
      createComparison('외주 가공비', ba.outsourcingCost, outsourcingCostTotal),
      createComparison('운반/포장비', ba.deliveryCost, deliveryCostTotal),
      createComparison('소모품비', ba.consumableCost, consumableCostTotal),
      createComparison('기타 공수', ba.manHourCost, otherManHourCost),
      createComparison('간접비', ba.overhead, indirectCostSubtotal),
    ]

    // 인당 생산성 지표 계산
    const totalPersonnel = data.projectInfo.totalPersonnel
    const estimatedManHours = data.projectInfo.estimatedManHours
    const revenuePerPerson = totalPersonnel > 0 ? totalRevenue / totalPersonnel : 0
    const valueAddedPerPerson = totalPersonnel > 0 ? (totalRevenue - directCostSubtotal) / totalPersonnel : 0
    const efficiencyPerManHour = estimatedManHours > 0 ? totalRevenue / estimatedManHours : 0

    return {
      totalRevenue,
      designCostTotal: designCostWithManHour,
      electricalMaterialTotal,
      panelCostTotal: panelCostWithManHour,
      wiringCostTotal: wiringCostWithManHour,
      travelExpenseTotal,
      setupCostTotal: setupCostWithManHour,
      outsourcingCostTotal,
      deliveryCostTotal,
      consumableCostTotal,
      manHourCostTotal: otherManHourCost,  // 기타 공수만 별도 표시
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
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI) {
      alert('저장 기능은 데스크톱 앱에서만 사용 가능합니다.')
      return
    }

    const result = await window.electronAPI.saveProject(JSON.stringify(data, null, 2))
    if (result.success) {
      alert('프로젝트가 저장되었습니다.')
    } else if (!result.canceled) {
      alert('저장 실패: ' + result.error)
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
        const migratedData: ProjectData = {
          ...initialData,
          ...loadedData,
          projectInfo: { ...initialData.projectInfo, ...loadedData.projectInfo },
          designCosts: loadedData.designCosts ?? [],
          electricalMaterials: loadedData.electricalMaterials ?? [],
          // 구 panelCost 객체를 새 panelCosts 배열로 변환
          panelCosts: loadedData.panelCosts ?? [],
          wiringCosts: loadedData.wiringCosts ?? [],
          travelExpense: { ...initialData.travelExpense, ...loadedData.travelExpense },
          setupCosts: loadedData.setupCosts ?? [],
          outsourcingCosts: loadedData.outsourcingCosts ?? [],
          deliveryCost: { ...initialData.deliveryCost, ...loadedData.deliveryCost },
          consumableCosts: loadedData.consumableCosts ?? [],
          overheadAndMargin: { ...initialData.overheadAndMargin, ...loadedData.overheadAndMargin },
          budgetAllocation: { ...initialData.budgetAllocation, ...loadedData.budgetAllocation },
          manHourCost: loadedData.manHourCost ?? { workers: [] },
        }

        setData(migratedData)
        alert('프로젝트를 불러왔습니다.')
      } catch {
        alert('파일 형식이 올바르지 않습니다.')
      }
    } else if (!result.canceled) {
      alert('불러오기 실패: ' + result.error)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>프로젝트 손익계산기</h1>
        <div className="header-actions">
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

      <main className="main-content">
        <div className="forms-container">
          <ProjectInfoForm
            data={data.projectInfo}
            onChange={(projectInfo) => setData({ ...data, projectInfo })}
          />
          <DesignCostForm
            data={data.designCosts}
            onChange={(designCosts) => setData({ ...data, designCosts })}
          />
          <ElectricalMaterialForm
            data={data.electricalMaterials}
            onChange={(electricalMaterials) => setData({ ...data, electricalMaterials })}
          />
          <PanelCostForm
            data={data.panelCosts}
            onChange={(panelCosts) => setData({ ...data, panelCosts })}
          />
          <WiringCostForm
            data={data.wiringCosts}
            onChange={(wiringCosts) => setData({ ...data, wiringCosts })}
          />
          <TravelExpenseForm
            data={data.travelExpense}
            onChange={(travelExpense) => setData({ ...data, travelExpense })}
          />
          <SetupCostForm
            data={data.setupCosts}
            onChange={(setupCosts) => setData({ ...data, setupCosts })}
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
          <ManHourCostForm
            data={data.manHourCost}
            onChange={(manHourCost) => setData({ ...data, manHourCost })}
          />
          <OverheadMarginForm
            data={data.overheadAndMargin}
            onChange={(overheadAndMargin) => setData({ ...data, overheadAndMargin })}
          />
          <BudgetAllocationForm
            data={data.budgetAllocation}
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
