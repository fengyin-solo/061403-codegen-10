import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const QUEST_TEMPLATES = [
  {
    id: 'chop_wood',
    type: 'chop',
    name: '樵夫的使命',
    description: '砍伐一定数量的木头',
    icon: '🪓',
    targets: [8, 12, 16],
    rewards: [
      { type: 'wood', amount: 5 },
      { type: 'food', amount: 3 },
      { type: 'hide', amount: 2 }
    ]
  },
  {
    id: 'hunt_animals',
    type: 'hunt',
    name: '猎人的荣耀',
    description: '成功狩猎一定次数',
    icon: '🏹',
    targets: [2, 3, 5],
    rewards: [
      { type: 'food', amount: 4 },
      { type: 'tools', amount: 1 },
      { type: 'hide', amount: 3 }
    ]
  },
  {
    id: 'craft_tools',
    type: 'craft',
    name: '匠人的手艺',
    description: '制作一定数量的工具',
    icon: '⚒️',
    targets: [1, 2, 3],
    rewards: [
      { type: 'wood', amount: 6 },
      { type: 'hide', amount: 2 },
      { type: 'food', amount: 4 }
    ]
  },
  {
    id: 'make_fire',
    type: 'fire',
    name: '守火者',
    description: '点燃篝火一定次数',
    icon: '🔥',
    targets: [2, 3, 4],
    rewards: [
      { type: 'wood', amount: 4 },
      { type: 'heat', amount: 30 },
      { type: 'food', amount: 3 }
    ]
  },
  {
    id: 'eat_food',
    type: 'eat',
    name: '生存进食',
    description: '进食一定次数',
    icon: '🍖',
    targets: [3, 4, 5],
    rewards: [
      { type: 'temperature', amount: 20 },
      { type: 'food', amount: 2 },
      { type: 'hide', amount: 1 }
    ]
  },
  {
    id: 'survive_day',
    type: 'survive',
    name: '熬过寒夜',
    description: '安全度过夜晚一定天数',
    icon: '🌙',
    targets: [1, 2, 3],
    rewards: [
      { type: 'wood', amount: 3 },
      { type: 'heat', amount: 25 },
      { type: 'tools', amount: 1 }
    ]
  }
]

const TITLE_TIERS = [
  { id: 'novice', name: '萌新求生者', icon: '🌱', requiredCompletions: 3 },
  { id: 'survivor', name: '熟练生存者', icon: '⛺', requiredCompletions: 8 },
  { id: 'veteran', name: '资深生存者', icon: '🎖️', requiredCompletions: 15 },
  { id: 'master', name: '荒野大师', icon: '👑', requiredCompletions: 25 },
  { id: 'legend', name: '极地传说', icon: '❄️', requiredCompletions: 40 }
]

const SPECIAL_LOGS = [
  '发现了一处古老的猎户营地遗迹，残留的工具让你受益匪浅。',
  '在雪地中发现了一本破旧的日记，记录着前人的生存智慧。',
  '夜晚的极光如此绚烂，让你暂时忘却了严寒的恐惧。',
  '捕获了一只罕见的白狐，它的皮毛格外厚实温暖。',
  '找到了一个天然的避风洞穴，可以抵御暴风雪的侵袭。',
  '发现了生长在岩石缝中的耐寒浆果，为食物增添了新来源。',
  '在星空下冥想，感受到了大自然的神秘力量。',
  '搭建了一个更稳固的庇护所结构，让营地变得更加安全。'
]

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])

  const dailyQuests = ref([])
  const questProgress = ref({})
  const completedQuestCount = ref(0)
  const currentTitle = ref(null)
  const unlockedTitles = ref([])
  const unlockedSpecialLogs = ref([])

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => wood.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => 0.3 + tools.value * 0.15)

  const nextTitle = computed(() => {
    return TITLE_TIERS.find(t => !unlockedTitles.value.includes(t.id)) || null
  })

  const titleProgress = computed(() => {
    if (!nextTitle.value) return { current: completedQuestCount.value, required: null, percentage: 100 }
    const prevTier = TITLE_TIERS[TITLE_TIERS.indexOf(nextTitle.value) - 1]
    const base = prevTier ? prevTier.requiredCompletions : 0
    const current = completedQuestCount.value - base
    const required = nextTitle.value.requiredCompletions - base
    return {
      current: Math.max(0, current),
      required,
      percentage: Math.min(100, Math.floor((current / required) * 100))
    }
  })

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 20) {
      actionLog.value.pop()
    }
  }

  function generateDailyQuests() {
    const shuffled = [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 3)
    dailyQuests.value = selected.map(template => {
      const difficultyTier = Math.min(2, Math.floor((dayCount.value - 1) / 3))
      return {
        ...template,
        target: template.targets[difficultyTier],
        rewards: template.rewards,
        claimedTier: -1,
        completed: false
      }
    })
    questProgress.value = {}
    dailyQuests.value.forEach(q => {
      questProgress.value[q.id] = 0
    })
    addLog('📜 营地任务板已刷新！完成任务获取丰厚奖励。', 'success')
  }

  function updateQuestProgress(type, amount = 1) {
    if (gameOver.value) return

    dailyQuests.value.forEach(quest => {
      if (quest.type === type && !quest.completed) {
        questProgress.value[quest.id] = (questProgress.value[quest.id] || 0) + amount

        if (questProgress.value[quest.id] >= quest.target && quest.claimedTier < 0) {
          quest.completed = true
        }
      }
    })
  }

  function claimQuestReward(questId) {
    const quest = dailyQuests.value.find(q => q.id === questId)
    if (!quest || quest.claimedTier >= 0) {
      addLog('无法领取奖励：任务未完成或奖励已领取', 'warning')
      return false
    }

    if (questProgress.value[questId] < quest.target) {
      addLog('无法领取奖励：任务进度不足', 'warning')
      return false
    }

    quest.claimedTier = 0
    completedQuestCount.value++

    const rewardText = []
    quest.rewards.forEach(reward => {
      switch (reward.type) {
        case 'wood':
          wood.value += reward.amount
          rewardText.push(`${reward.amount} 木头`)
          break
        case 'food':
          food.value += reward.amount
          rewardText.push(`${reward.amount} 食物`)
          break
        case 'hide':
          hide.value += reward.amount
          rewardText.push(`${reward.amount} 兽皮`)
          break
        case 'tools':
          tools.value += reward.amount
          rewardText.push(`${reward.amount} 工具`)
          break
        case 'heat':
          heat.value = Math.min(100, heat.value + reward.amount)
          rewardText.push(`${reward.amount} 热量`)
          break
        case 'temperature':
          temperature.value = Math.min(100, temperature.value + reward.amount)
          rewardText.push(`${reward.amount} 体温`)
          break
      }
    })

    addLog(`🎉 完成任务「${quest.name}」！获得：${rewardText.join('，')}`, 'success')

    if (Math.random() < 0.4) {
      unlockSpecialLog()
    }

    checkTitleUnlock()

    return true
  }

  function unlockSpecialLog() {
    const available = SPECIAL_LOGS.filter(log => !unlockedSpecialLogs.value.includes(log))
    if (available.length === 0) return

    const selected = available[Math.floor(Math.random() * available.length)]
    unlockedSpecialLogs.value.push(selected)
    addLog(`📖 解锁特殊日志！${selected}`, 'success')
  }

  function checkTitleUnlock() {
    TITLE_TIERS.forEach(tier => {
      if (completedQuestCount.value >= tier.requiredCompletions && !unlockedTitles.value.includes(tier.id)) {
        unlockedTitles.value.push(tier.id)
        currentTitle.value = tier.id
        addLog(`🏆 恭喜解锁新称号：${tier.icon} ${tier.name}！`, 'success')
      }
    })
  }

  function getTitleInfo(titleId) {
    return TITLE_TIERS.find(t => t.id === titleId) || null
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * multiplier
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        temperature.value = Math.min(80, temperature.value + 1)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
    }
    
    checkGameOver()
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')
    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)
    
    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    updateQuestProgress('survive', 1)
    generateDailyQuests()
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 5 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    const woodGained = Math.floor(Math.random() * 3) + 2
    wood.value += woodGained
    updateQuestProgress('chop', woodGained)
    
    addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温`, 'action')
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 8 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    if (Math.random() < huntSuccessRate.value) {
      const foodGained = Math.floor(Math.random() * 3) + 2
      const hideGained = Math.floor(Math.random() * 2) + 1
      food.value += foodGained
      hide.value += hideGained
      updateQuestProgress('hunt', 1)
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 6 * multiplier
    
    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)
    updateQuestProgress('craft', 1)
    
    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function makeFire() {
    if (gameOver.value || !canMakeFire.value) {
      addLog('木头不足：生火需要 3 木头', 'warning')
      return
    }
    
    wood.value -= 3
    const heatGained = Math.floor(Math.random() * 20) + 25
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + 10)
    updateQuestProgress('fire', 1)
    
    addLog(`生火：获得 ${heatGained} 热量，体温上升 10`, 'success')
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }
    
    food.value -= 1
    const tempGained = Math.floor(Math.random() * 10) + 5
    temperature.value = Math.min(100, temperature.value + tempGained)
    updateQuestProgress('eat', 1)
    
    addLog(`进食：体温恢复 ${tempGained}`, 'success')
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      dailyQuests: dailyQuests.value,
      questProgress: questProgress.value,
      completedQuestCount: completedQuestCount.value,
      currentTitle: currentTitle.value,
      unlockedTitles: unlockedTitles.value,
      unlockedSpecialLogs: unlockedSpecialLogs.value,
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }
    
    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard
      dailyQuests.value = gameState.dailyQuests || []
      questProgress.value = gameState.questProgress || {}
      completedQuestCount.value = gameState.completedQuestCount || 0
      currentTitle.value = gameState.currentTitle || null
      unlockedTitles.value = gameState.unlockedTitles || []
      unlockedSpecialLogs.value = gameState.unlockedSpecialLogs || []
      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []
      
      stopTimers()
      startTimers()
      
      if (!isDay.value) {
        startNightCycle()
      }
      
      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    food.value = 5
    hide.value = 0
    tools.value = 0
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []
    dailyQuests.value = []
    questProgress.value = {}
    completedQuestCount.value = 0
    currentTitle.value = null
    unlockedTitles.value = []
    unlockedSpecialLogs.value = []
    
    stopTimers()
    startTimers()
    generateDailyQuests()
    
    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    generateDailyQuests()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    food,
    hide,
    tools,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canHunt,
    huntSuccessRate,
    chopWood,
    hunt,
    makeTools,
    makeFire,
    eatFood,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame,
    dailyQuests,
    questProgress,
    completedQuestCount,
    currentTitle,
    unlockedTitles,
    unlockedSpecialLogs,
    nextTitle,
    titleProgress,
    claimQuestReward,
    getTitleInfo
  }
}
