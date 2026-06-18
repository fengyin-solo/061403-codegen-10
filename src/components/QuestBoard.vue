<template>
  <div class="quest-board">
    <h3 class="panel-title">📜 营地任务板</h3>

    <div v-if="currentTitleInfo" class="current-title">
      <span class="title-icon">{{ currentTitleInfo.icon }}</span>
      <span class="title-name">{{ currentTitleInfo.name }}</span>
    </div>

    <div v-if="nextTitleInfo" class="title-progress-section">
      <div class="title-progress-label">
        <span>下一称号：{{ nextTitleInfo.icon }} {{ nextTitleInfo.name }}</span>
        <span class="progress-text">{{ titleProgress.current }}/{{ titleProgress.required }}</span>
      </div>
      <div class="title-progress-bar-container">
        <div class="title-progress-bar" :style="{ width: titleProgress.percentage + '%' }"></div>
      </div>
    </div>
    <div v-else class="title-progress-section maxed">
      <span class="maxed-text">🏆 已达到最高称号！</span>
    </div>

    <div class="quest-stats">
      <span>已完成任务：{{ completedCount }} 个</span>
    </div>

    <div class="quest-list">
      <div
        v-for="quest in quests"
        :key="quest.id"
        class="quest-card"
        :class="{ completed: isClaimed(quest), ready: canClaim(quest) }"
      >
        <div class="quest-header">
          <span class="quest-icon">{{ quest.icon }}</span>
          <div class="quest-title-wrap">
            <span class="quest-name">{{ quest.name }}</span>
            <span class="quest-desc">{{ quest.description }}</span>
          </div>
        </div>

        <div class="quest-progress-section">
          <div class="progress-label">
            <span>进度</span>
            <span>{{ getProgress(quest.id) }}/{{ quest.target }}</span>
          </div>
          <div class="progress-bar-container">
            <div
              class="progress-bar"
              :style="{ width: getProgressPercent(quest) + '%' }"
              :class="{ full: getProgress(quest.id) >= quest.target }"
            ></div>
          </div>
        </div>

        <div class="quest-rewards">
          <span class="rewards-label">奖励：</span>
          <span v-for="(reward, idx) in quest.rewards" :key="idx" class="reward-tag">
            {{ getRewardIcon(reward.type) }} {{ reward.amount }}
          </span>
        </div>

        <button
          v-if="!isClaimed(quest)"
          class="claim-btn"
          :class="{ disabled: !canClaim(quest) }"
          :disabled="!canClaim(quest)"
          @click="handleClaim(quest.id)"
        >
          {{ canClaim(quest) ? '🎁 领取奖励' : '进行中...' }}
        </button>
        <div v-else class="claimed-badge">
          ✅ 已完成
        </div>
      </div>
    </div>

    <div v-if="specialLogs.length > 0" class="special-logs-section">
      <h4 class="section-subtitle">📖 特殊日志</h4>
      <div class="special-logs-list">
        <div v-for="(log, idx) in specialLogs" :key="idx" class="special-log-item">
          <span class="log-bullet">✨</span>
          <span class="log-text">{{ log }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  quests: {
    type: Array,
    default: () => []
  },
  progress: {
    type: Object,
    default: () => ({})
  },
  completedCount: {
    type: Number,
    default: 0
  },
  currentTitle: {
    type: String,
    default: null
  },
  unlockedTitles: {
    type: Array,
    default: () => []
  },
  nextTitle: {
    type: Object,
    default: null
  },
  titleProgress: {
    type: Object,
    default: () => ({ current: 0, required: null, percentage: 0 })
  },
  specialLogs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['claim'])

const TITLES = [
  { id: 'novice', name: '萌新求生者', icon: '🌱', requiredCompletions: 3 },
  { id: 'survivor', name: '熟练生存者', icon: '⛺', requiredCompletions: 8 },
  { id: 'veteran', name: '资深生存者', icon: '🎖️', requiredCompletions: 15 },
  { id: 'master', name: '荒野大师', icon: '👑', requiredCompletions: 25 },
  { id: 'legend', name: '极地传说', icon: '❄️', requiredCompletions: 40 }
]

const currentTitleInfo = computed(() => {
  if (!props.currentTitle) return null
  return TITLES.find(t => t.id === props.currentTitle)
})

const nextTitleInfo = computed(() => props.nextTitle)

function getProgress(questId) {
  return props.progress[questId] || 0
}

function getProgressPercent(quest) {
  const current = getProgress(quest.id)
  return Math.min(100, Math.floor((current / quest.target) * 100))
}

function canClaim(quest) {
  return getProgress(quest.id) >= quest.target && quest.claimedTier < 0
}

function isClaimed(quest) {
  return quest.claimedTier >= 0
}

function getRewardIcon(type) {
  const icons = {
    wood: '🪵',
    food: '🍖',
    hide: '🦊',
    tools: '🔪',
    heat: '🔥',
    temperature: '🌡️'
  }
  return icons[type] || '🎁'
}

function handleClaim(questId) {
  emit('claim', questId)
}
</script>

<style scoped>
.quest-board {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
  max-height: 800px;
  overflow-y: auto;
}

.quest-board::-webkit-scrollbar {
  width: 6px;
}

.quest-board::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.quest-board::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.panel-title {
  color: white;
  font-size: 18px;
  margin: 0;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.current-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2));
  border: 2px solid rgba(255, 215, 0, 0.4);
  border-radius: 12px;
}

.title-icon {
  font-size: 24px;
}

.title-name {
  color: #ffd700;
  font-weight: bold;
  font-size: 15px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.title-progress-section {
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.title-progress-section.maxed {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(147, 112, 219, 0.15));
}

.maxed-text {
  color: #ffd700;
  font-weight: bold;
  font-size: 14px;
}

.title-progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.progress-text {
  font-weight: bold;
  color: #ffd700;
}

.title-progress-bar-container {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.title-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.quest-stats {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quest-card {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  padding: 14px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  animation: slideIn 0.4s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quest-card.ready {
  border-color: rgba(46, 204, 113, 0.6);
  background: rgba(46, 204, 113, 0.1);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 rgba(46, 204, 113, 0);
  }
  50% {
    box-shadow: 0 0 15px rgba(46, 204, 113, 0.3);
  }
}

.quest-card.completed {
  opacity: 0.7;
  background: rgba(100, 100, 100, 0.2);
}

.quest-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.quest-icon {
  font-size: 28px;
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}

.quest-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.quest-name {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.quest-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.quest-progress-section {
  margin-bottom: 10px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5px;
}

.progress-bar-container {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #9b59b6);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-bar.full {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.quest-rewards {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
}

.rewards-label {
  color: rgba(255, 255, 255, 0.6);
}

.reward-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
}

.claim-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
}

.claim-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(46, 204, 113, 0.4);
}

.claim-btn:active:not(.disabled) {
  transform: translateY(0);
}

.claim-btn.disabled {
  background: rgba(150, 150, 150, 0.4);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  box-shadow: none;
}

.claimed-badge {
  text-align: center;
  padding: 10px;
  color: #2ecc71;
  font-weight: bold;
  font-size: 13px;
  background: rgba(46, 204, 113, 0.1);
  border-radius: 8px;
}

.special-logs-section {
  margin-top: 5px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin: 0 0 10px 0;
  text-align: center;
}

.special-logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.special-log-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.15), rgba(142, 68, 173, 0.1));
  border-left: 3px solid #9b59b6;
  border-radius: 0 8px 8px 0;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.log-bullet {
  font-size: 14px;
  flex-shrink: 0;
}

.log-text {
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  line-height: 1.4;
}
</style>
