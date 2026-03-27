"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Heart, TrendingUp, TrendingDown, Minus, Calendar, Filter, X, Activity, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import type { HealthMarker } from "@/lib/generate-patient-details-data"

interface HealthMarkerTrendChartProps {
  healthMarker: HealthMarker
  onClose: () => void
}

export default function HealthMarkerTrendChart({ healthMarker, onClose }: HealthMarkerTrendChartProps) {
  const [timeFilter, setTimeFilter] = useState<string>("ALL")
  const [labFilter, setLabFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Get filtered data based on selected filters
  const getFilteredData = () => {
    let filteredData = [...healthMarker.history]
    
    // Apply time filter
    if (timeFilter !== "ALL") {
      const now = new Date()
      const startDate = new Date()
      
      switch (timeFilter) {
        case "3M":
          startDate.setMonth(now.getMonth() - 3)
          break
        case "6M":
          startDate.setMonth(now.getMonth() - 6)
          break
        case "12M":
          startDate.setFullYear(now.getFullYear() - 1)
          break
        case "18M":
          startDate.setMonth(now.getMonth() - 18)
          break
        default:
          return filteredData
      }
      
      filteredData = filteredData.filter((item) => new Date(item.date) >= startDate)
    }
    
    // Apply lab filter
    if (labFilter !== "all") {
      filteredData = filteredData.filter((item) => item.labName === labFilter)
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filteredData = filteredData.filter((item) => item.status === statusFilter)
    }
    
    return filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const filteredData = getFilteredData()
  
  // Get unique labs for filter options
  const uniqueLabs = [...new Set(healthMarker.history.map(d => d.labName))]
  
  // Calculate chart dimensions and ranges
  const getChartData = () => {
    if (filteredData.length === 0) return null
    
    const values = filteredData.map(d => d.value)
    const allReferenceRanges = filteredData.map(d => [d.referenceRange.min, d.referenceRange.max]).flat()
    const allValues = [...values, ...allReferenceRanges, healthMarker.normalRange.min, healthMarker.normalRange.max]
    
    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues)
    const range = maxValue - minValue
    const padding = range * 0.1 // 10% padding
    
    const chartMin = Math.max(0, minValue - padding)
    const chartMax = maxValue + padding
    const chartRange = chartMax - chartMin
    
    return {
      min: chartMin,
      max: chartMax,
      range: chartRange,
      values,
      normalMin: healthMarker.normalRange.min,
      normalMax: healthMarker.normalRange.max
    }
  }

  const chartData = getChartData()
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "#16a34a" // green
      case "high":
        return "#f59e0b" // amber
      case "low": 
        return "#f59e0b" // amber
      case "critical":
        return "#dc2626" // red
      default:
        return "#6b7280" // gray
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <CheckCircle2 className="w-3 h-3" />
      case "high":
      case "low":
        return <AlertTriangle className="w-3 h-3" />
      case "critical":
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Activity className="w-3 h-3" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    })
  }

  if (!chartData || filteredData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-6xl max-h-[90vh] m-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              {healthMarker.healthMarker} Trend Analysis
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6 text-center text-gray-500">
            <p>No data available for the selected filters</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-7xl max-h-[95vh] m-4 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span>{healthMarker.healthMarker} Trend Analysis</span>
            <Badge variant="outline" className="ml-2">
              {healthMarker.category}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[calc(95vh-100px)]">
          {/* Filters */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Time:</span>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="6M">6 Months</SelectItem>
                  <SelectItem value="12M">12 Months</SelectItem>
                  <SelectItem value="18M">18 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Lab:</span>
              <Select value={labFilter} onValueChange={setLabFilter}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labs</SelectItem>
                  {uniqueLabs.map((lab) => (
                    <SelectItem key={lab} value={lab}>
                      {lab}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(timeFilter !== "ALL" || labFilter !== "all" || statusFilter !== "all") && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setTimeFilter("ALL")
                  setLabFilter("all")
                  setStatusFilter("all")
                }}
                className="h-8"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Trend Visualization ({filteredData.length} data points)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-gray-50 rounded-lg p-4 relative">
                <div className="absolute inset-4">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-600">
                    <span>{chartData.max.toFixed(1)}</span>
                    <span>{((chartData.max + chartData.min) / 2).toFixed(1)}</span>
                    <span>{chartData.min.toFixed(1)}</span>
                  </div>

                  {/* Normal range background */}
                  <div className="ml-12 mr-4 h-full relative">
                    <div 
                      className="absolute w-full bg-green-100 border-t border-b border-green-200"
                      style={{
                        top: `${100 - ((chartData.normalMax - chartData.min) / chartData.range) * 100}%`,
                        height: `${((chartData.normalMax - chartData.normalMin) / chartData.range) * 100}%`
                      }}
                    >
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs text-green-600 font-medium">
                        Normal Range
                      </div>
                    </div>

                    {/* Chart line and points */}
                    {filteredData.length > 1 && (
                      <svg className="w-full h-full">
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="4,2"
                          points={filteredData
                            .map((point, index) => {
                              const x = filteredData.length > 1 ? (index / (filteredData.length - 1)) * 100 : 50
                              const y = 100 - ((point.value - chartData.min) / chartData.range) * 100
                              return `${x}%,${y}%`
                            })
                            .join(" ")}
                        />
                      </svg>
                    )}
                    
                    {/* Data points with lab icons */}
                    <div className="absolute inset-0">
                      {filteredData.map((point, index) => {
                        const x = filteredData.length > 1 ? (index / (filteredData.length - 1)) * 100 : 50
                        const y = 100 - ((point.value - chartData.min) / chartData.range) * 100
                        return (
                          <div
                            key={index}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`
                            }}
                            title={`${formatDate(point.date)}: ${point.value} ${healthMarker.units} (${point.labName})`}
                          >
                            {/* Data point circle */}
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs"
                              style={{ 
                                backgroundColor: getStatusColor(point.status)
                              }}
                            >
                              <span className="text-white text-xs">{point.labIcon}</span>
                            </div>
                            
                            {/* Hover tooltip */}
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <div className="text-center">
                                <div className="font-semibold">{point.value} {healthMarker.units}</div>
                                <div className="flex items-center gap-1 justify-center">
                                  {getStatusIcon(point.status)}
                                  <span className="capitalize">{point.status}</span>
                                </div>
                                <div className="text-xs opacity-75">{formatDate(point.date)}</div>
                                <div className="text-xs opacity-75">{point.labName}</div>
                                <div className="text-xs opacity-75">
                                  Ref: {point.referenceRange.min}-{point.referenceRange.max}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-12 right-4 flex justify-between text-xs text-gray-600">
                    {filteredData.map((point, index) => {
                      // Show only every nth label to avoid crowding
                      const showLabel = filteredData.length <= 6 || index % Math.ceil(filteredData.length / 6) === 0 || index === filteredData.length - 1
                      return (
                        <span 
                          key={index} 
                          className={`transform -rotate-45 origin-center ${showLabel ? '' : 'opacity-0'}`}
                        >
                          {formatDate(point.date)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Latest Value</span>
              </div>
              <p className="text-xl font-semibold text-blue-900">
                {filteredData[filteredData.length - 1]?.value} {healthMarker.units}
              </p>
              <p className="text-xs text-blue-700">
                {filteredData[filteredData.length - 1]?.labName}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Trend</span>
              </div>
              <p className="text-xl font-semibold text-green-900 capitalize">
                {healthMarker.trend}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Data Points</span>
              </div>
              <p className="text-xl font-semibold text-purple-900">
                {filteredData.length}
              </p>
              <p className="text-xs text-purple-700">
                {uniqueLabs.length} lab{uniqueLabs.length > 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Normal Range</span>
              </div>
              <p className="text-xl font-semibold text-amber-900">
                {healthMarker.normalRange.min}-{healthMarker.normalRange.max}
              </p>
              <p className="text-xs text-amber-700">{healthMarker.units}</p>
            </div>
          </div>

          {/* Lab Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lab Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueLabs.map((lab) => {
                  const labData = filteredData.filter(d => d.labName === lab)
                  const latestPoint = labData[labData.length - 1]
                  
                  return (
                    <div key={lab} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{latestPoint?.labIcon}</span>
                        <div>
                          <p className="font-medium text-sm">{lab}</p>
                          <p className="text-xs text-gray-600">{labData.length} tests</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={latestPoint?.status === 'normal' ? 'default' : 
                                  latestPoint?.status === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {getStatusIcon(latestPoint?.status || '')}
                          <span className="ml-1 capitalize">{latestPoint?.status}</span>
                        </Badge>
                        <span className="text-sm font-medium">
                          {latestPoint?.value} {healthMarker.units}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}