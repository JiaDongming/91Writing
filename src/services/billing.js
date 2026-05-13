import { listTokenUsage, getMySubscription } from './workspaceApi'

class BillingService {
  // 模型价格配置（每1000个token的价格，单位：人民币）
  getModelPricing() {
    return {
      'gpt-4': {
        input: 0.21,
        output: 0.42
      },
      'gpt-4-turbo': {
        input: 0.07,
        output: 0.21
      },
      'gpt-3.5-turbo': {
        input: 0.0035,
        output: 0.0105
      },
      'claude-3-opus': {
        input: 0.105,
        output: 0.525
      },
      'claude-3-sonnet': {
        input: 0.021,
        output: 0.105
      },
      'claude-3-haiku': {
        input: 0.0014,
        output: 0.007
      },
      'default': {
        input: 0.007,
        output: 0.014
      }
    }
  }

  // 计算token使用费用
  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.getModelPricing()
    const modelPricing = pricing[model] || pricing['default']

    const inputCost = (inputTokens / 1000) * modelPricing.input
    const outputCost = (outputTokens / 1000) * modelPricing.output

    return inputCost + outputCost
  }

  // 估算prompt的token数量
  estimateTokens(text) {
    if (!text) return 0

    const chineseChars = (text.match(/[一-龥]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const otherChars = text.length - chineseChars - englishWords

    return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5)
  }

  // 获取账户配额信息（从订阅）
  async getAccountBalance() {
    try {
      const subscription = await getMySubscription()
      if (!subscription) return 0
      return subscription.plan?.tokenQuotaMonthly || 0
    } catch {
      return 0
    }
  }

  // 获取计费记录（从后端）
  async getBillingRecords() {
    try {
      const records = await listTokenUsage()
      return records.map(r => ({
        id: r.id,
        timestamp: r.createdAt,
        type: r.operationType || 'generation',
        model: r.model,
        content: r.requestPayload?.prompt || r.requestPayload?.messages?.map(m => m.content).join('\n') || '',
        response: '',
        inputTokens: r.promptTokens || 0,
        outputTokens: r.completionTokens || 0,
        totalTokens: r.totalTokens || 0,
        cost: this.calculateCost(r.model, r.promptTokens || 0, r.completionTokens || 0),
        status: 'success'
      }))
    } catch {
      return []
    }
  }

  // 获取使用统计（从后端记录聚合）
  async getUsageStats() {
    try {
      const records = await this.getBillingRecords()
      return {
        totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
        totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
        totalCost: records.reduce((sum, r) => sum + r.cost, 0),
        lastResetDate: new Date().toISOString()
      }
    } catch {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        lastResetDate: new Date().toISOString()
      }
    }
  }

  // 获取今日使用统计
  async getTodayStats() {
    const records = await this.getBillingRecords()
    const today = new Date().toDateString()

    const todayRecords = records.filter(record =>
      new Date(record.timestamp).toDateString() === today
    )

    return {
      tokenCount: todayRecords.reduce((sum, record) => sum + record.totalTokens, 0),
      cost: todayRecords.reduce((sum, record) => sum + record.cost, 0),
      requestCount: todayRecords.length
    }
  }

  // 获取最近N天的使用趋势
  async getUsageTrend(days = 7) {
    const records = await this.getBillingRecords()
    const trend = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toDateString()

      const dayRecords = records.filter(record =>
        new Date(record.timestamp).toDateString() === dateString
      )

      trend.push({
        date: dateString,
        tokenCount: dayRecords.reduce((sum, record) => sum + record.totalTokens, 0),
        cost: dayRecords.reduce((sum, record) => sum + record.cost, 0),
        requestCount: dayRecords.length
      })
    }

    return trend
  }

  // 记录API调用（后端已自动记录，此方法保留兼容但不再写 localStorage）
  recordAPICall(params) {
    console.log(`API调用：模型=${params.model}, 输入=${params.inputTokens}tokens, 输出=${params.outputTokens}tokens`)
  }

  // 导出计费数据
  async exportBillingData(format = 'json') {
    const records = await this.getBillingRecords()
    const stats = await this.getUsageStats()

    const exportData = {
      exportTime: new Date().toISOString(),
      usageStats: stats,
      records: records
    }

    if (format === 'csv') {
      let csv = 'timestamp,type,model,inputTokens,outputTokens,totalTokens,cost,status\n'
      records.forEach(record => {
        csv += `${record.timestamp},${record.type},${record.model},${record.inputTokens},${record.outputTokens},${record.totalTokens},${record.cost},${record.status}\n`
      })
      return csv
    }

    return JSON.stringify(exportData, null, 2)
  }
}

export default new BillingService()
