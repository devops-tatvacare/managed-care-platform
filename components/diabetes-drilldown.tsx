"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts"

interface DiabetesDrilldownProps {
  onBack: () => void
}

export default function DiabetesDrilldown({ onBack }: DiabetesDrilldownProps) {
  const [filter, setFilter] = useState("diabetes")

  // Diabetes Burden Breakdown data
  const diabetesBurdenData = [
    { name: "Prediabetes", value: 485.7, displayValue: "485.7K", percentage: "45%", color: "#10b981" },
    { name: "Type 2", value: 312.9, displayValue: "312.9K", percentage: "29%", color: "#ef4444" },
    { name: "Undiagnosed", value: 151.2, displayValue: "151.2K", percentage: "14%", color: "#f59e0b" },
    { name: "Gestational", value: 97.1, displayValue: "97.1K", percentage: "9%", color: "#8b5cf6" },
    { name: "Type 1", value: 32.4, displayValue: "32.4K", percentage: "3%", color: "#06b6d4" }
  ]

  // Key Statistics KPIs
  const keyStats = [
    { label: "Type 2 Diabetes", value: "312.9K cases", percentage: "29%" },
    { label: "Prediabetes", value: "485.7K cases", percentage: "45%" },
    { label: "Undiagnosed", value: "151.2K cases", percentage: "14%" },
    { label: "Gestational", value: "97.1K cases", percentage: "9%" },
    { label: "Type 1", value: "32.4K cases", percentage: "3%" }
  ]

  // Gestational Diabetes data
  const gdmTrimesterData = [
    { trimester: "1st (0-12w)", diagnosis: 11.4, atRisk: 4200 },
    { trimester: "2nd (13-28w)", diagnosis: 60.0, atRisk: 14500 },
    { trimester: "3rd (29-40w)", diagnosis: 28.6, atRisk: 7800 }
  ]

  // Risk Stratification Matrix data
  const riskMatrixData = [
    { riskLevel: "Very High Risk", diabetes: 46.2, gdm: 52.1, patients: 3.5 },
    { riskLevel: "High Risk", diabetes: 24.5, gdm: 35.7, patients: 8.2 },
    { riskLevel: "Medium Risk", diabetes: 12.8, gdm: 18.3, patients: 15.8 },
    { riskLevel: "Low Risk", diabetes: 5.2, gdm: 8.5, patients: 12.5 }
  ]

  // Progression Pathways data
  const progressionPathwaysData = [
    { 
      cohort: "Gestational DM", 
      baseline: 25000, 
      current: 7625, 
      progressPercent: 30.5,
      label: "30.5% (5yr)"
    },
    { 
      cohort: "Prediabetes", 
      baseline: 45000, 
      current: 26190, 
      progressPercent: 58.2,
      label: "58.2% (3yr)"
    },
    { 
      cohort: "Type 2 Early", 
      baseline: 35000, 
      current: 35000, 
      progressPercent: 100.0,
      label: "100.0% Current"
    },
    { 
      cohort: "Type 2 Advanced", 
      baseline: 15000, 
      current: 15000, 
      progressPercent: 100.0,
      label: "100.0% Current"
    }
  ]

  // Progression Insights data
  const progressionInsights = [
    {
      title: "Gestational Diabetes Cohort",
      baseline: "25,000 patients",
      progressionRate: "30.5% → Type 2 (5 years)",
      complications: "12.0%"
    },
    {
      title: "Prediabetes Cohort",
      baseline: "45,000 patients", 
      progressionRate: "58.2% → Type 2 (3 years)",
      complications: "25.5%"
    },
    {
      title: "Type 2 Early Stage",
      baseline: "35,000 patients",
      progressionRate: null,
      complications: "45.8%"
    },
    {
      title: "Type 2 Advanced",
      baseline: "15,000 patients",
      progressionRate: null,
      complications: "78.3%"
    }
  ]


  const renderRiskMatrix = () => {
    const matrix = [
      ["5.2%", "8.5%", "12.5k"],
      ["12.8%", "18.3%", "15.8k"],
      ["24.5%", "35.7%", "8.2k"],
      ["46.2%", "52.1%", "3.5k"]
    ]
    
    const labels = ["Low Risk", "Medium Risk", "High Risk", "Very High Risk"]
    const columnHeaders = ["Diabetes %", "GDM Risk %", "Patients (k)"]
    
    return (
      <div className="w-full px-2">
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div></div>
          {columnHeaders.map((header) => (
            <div key={header} className="text-sm text-center text-[hsl(var(--text-80))] font-medium">
              {header}
            </div>
          ))}
        </div>
        {matrix.reverse().map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-sm text-[hsl(var(--text-80))] py-6 pr-3 text-right font-medium flex items-center justify-end">
              {labels[3 - i]}
            </div>
            {row.map((cell, j) => {
              const intensity = (3 - i) * 25 + j * 10
              const bgColor = j === 2 
                ? `rgba(147, 197, 253, ${intensity / 100})` 
                : `rgba(239, 68, 68, ${intensity / 100})`
              return (
                <div
                  key={j}
                  className="py-6 px-4 text-center rounded-lg text-base font-semibold flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  {cell}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
      {/* Header with Back Button */}
      <div className="bg-card border-b border-[hsl(var(--stroke-grey))] p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-[hsl(var(--bg-10))]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-100))]">Diabetes Analysis Dashboard</h1>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--text-80))]">Filter by condition:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diabetes">Diabetes</SelectItem>
              <SelectItem value="hypertension">Hypertension</SelectItem>
              <SelectItem value="heart-disease">Heart Disease</SelectItem>
              <SelectItem value="copd">COPD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Row 1: Diabetes Burden and Key Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Diabetes Burden Breakdown - 60% width */}
            <Card className="lg:col-span-3 border border-[hsl(var(--stroke-grey))]">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--text-100))]">Diabetes Burden Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* Pie Chart */}
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={diabetesBurdenData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={130}
                          dataKey="value"
                          labelLine={false}
                          label={({ percentage }) => percentage}
                        >
                          {diabetesBurdenData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => `${value}K cases`}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend with values */}
                  <div className="space-y-3">
                    {diabetesBurdenData.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-sm font-medium text-[hsl(var(--text-100))]">
                              {item.name}
                            </span>
                            <span className="text-sm font-semibold text-[hsl(var(--text-100))]">
                              {item.displayValue}
                            </span>
                          </div>
                          <div className="text-xs text-[hsl(var(--text-60))]">
                            {item.percentage} of total
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Statistics - 40% width */}
            <Card className="lg:col-span-2 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Key Statistics</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {keyStats.map((stat) => (
                    <div key={stat.label} className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-[hsl(var(--text-100))]">{stat.label}</span>
                        <span className="text-sm font-semibold text-[hsl(var(--text-100))]">
                          {stat.value}
                        </span>
                      </div>
                      <div className="text-xs text-[hsl(var(--text-60))] mt-1">
                        {stat.percentage} of total burden
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Gestational Diabetes Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gestational Diabetes Analysis - 60% width */}
            <Card className="lg:col-span-3 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Gestational Diabetes Analysis</CardTitle>
                <p className="text-sm text-[hsl(var(--text-80))]">
                  Trimester distribution, at-risk patients, and screening protocols
                </p>
              </CardHeader>
              <CardContent className="pt-1">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gdmTrimesterData} margin={{ left: 5, right: 5, bottom: 5, top: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis 
                      dataKey="trimester" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }}
                      label={{ value: 'Diagnosis %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--text-60))' } }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }}
                      label={{ value: 'At-Risk Count', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'hsl(var(--text-60))' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '8px'
                      }}
                    />
                    <Bar yAxisId="left" dataKey="diagnosis" fill="#06b6d4" name="GDM Diag %" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="atRisk" stroke="#ef4444" strokeWidth={2} name="At-Risk Count" dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Screening Recommendations - 40% width */}
            <Card className="lg:col-span-2 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Screening Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">First Trimester (0-12 weeks)</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">100%</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">High Risk Only: FBS/HbA1c if BMI &gt;30</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Target coverage of high-risk patients</p>
                  </div>
                  
                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">Second Trimester (13-28 weeks)</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">87%</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">Universal Screening: 50g OGTT</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Current completion rate</p>
                  </div>

                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">Third Trimester (29-40 weeks)</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">Bi-weekly</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">Follow-up Only: Previously negative</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Monitoring frequency for positive cases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Risk Stratification Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Risk Stratification Matrix - 60% width */}
            <Card className="lg:col-span-3 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Risk Stratification Matrix</CardTitle>
                <p className="text-sm text-[hsl(var(--text-80))]">
                  Patient classification by diabetes and GDM risk levels
                </p>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                {renderRiskMatrix()}
              </CardContent>
            </Card>

            {/* Risk Factor Breakdown - 40% width */}
            <Card className="lg:col-span-2 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Risk Factor Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">Low Risk</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">12.5k</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">Regular monitoring, lifestyle counseling</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Standard care protocols</p>
                  </div>
                  
                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">Medium Risk</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">15.8k</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">Quarterly checks, diet intervention</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Enhanced monitoring required</p>
                  </div>

                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">High Risk</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">8.2k</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">Monthly monitoring, medication review</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Intensive care protocols</p>
                  </div>

                  <div className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[hsl(var(--text-100))]">Very High Risk</span>
                      <span className="text-sm font-semibold text-[hsl(var(--text-100))]">3.5k</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mt-1">Weekly monitoring, intensive management</p>
                    <p className="text-xs text-[hsl(var(--text-60))] mt-1">Critical care protocols</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[hsl(var(--stroke-grey))]">
                    <p className="text-xs text-[hsl(var(--text-60))]">
                      <span className="font-medium">Note:</span> Risk increases 2.3x per decade after age 35
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Progression Pathways */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Progression Pathways Chart - 60% width */}
            <Card className="lg:col-span-3 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Progression Pathways to Type 2 Diabetes</CardTitle>
                <p className="text-sm text-[hsl(var(--text-80))]">
                  Diabetes Progression Pathways
                </p>
              </CardHeader>
              <CardContent className="pt-1">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={progressionPathwaysData}
                    layout="vertical"
                    margin={{ left: 5, right: 5, top: 15, bottom: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis 
                      type="number"
                      domain={[0, 50000]}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }}
                      label={{ value: 'Baseline Count', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: 'hsl(var(--text-60))' } }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="cohort"
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }}
                      width={100}
                      label={{ value: 'Cohort', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--text-60))' } }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value).toLocaleString()} patients`, 'Baseline Count']}
                      labelFormatter={(label) => `${label} - ${progressionPathwaysData.find(d => d.cohort === label)?.label || ''}`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="baseline" 
                      fill="#6366f1" 
                      name="Baseline Count"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Progression Insights - 40% width */}
            <Card className="lg:col-span-2 border border-[hsl(var(--stroke-grey))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[hsl(var(--text-100))]">Progression Insights</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {progressionInsights.map((insight) => (
                    <div key={insight.title} className="p-3 bg-[hsl(var(--bg-10))] rounded-lg border border-[hsl(var(--stroke-grey))]">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-[hsl(var(--text-100))]">
                          {insight.title}
                        </span>
                        <span className="text-sm font-semibold text-[hsl(var(--text-100))]">
                          {insight.baseline}
                        </span>
                      </div>
                      
                      <div className="mt-1 space-y-1">
                        {insight.progressionRate && (
                          <p className="text-xs text-[hsl(var(--text-80))]">{insight.progressionRate}</p>
                        )}
                        <p className="text-xs text-[hsl(var(--text-60))]">Complications: {insight.complications}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}