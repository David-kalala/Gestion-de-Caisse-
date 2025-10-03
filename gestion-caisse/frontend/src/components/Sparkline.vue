<template>
<svg :viewBox="`0 0 ${width} ${height}`" :width="svgWidth" :height="height" preserveAspectRatio="none" role="img" aria-label="sparkline">
<polyline :points="points" fill="none" stroke="currentColor" stroke-width="2" opacity="0.9" />
</svg>
</template>


<script setup>
import { computed } from 'vue'


const props = defineProps({
data: { type: Array, default: () => [] }, // array of numbers
width: { type: Number, default: 100 },
height: { type: Number, default: 60 },
padX: { type: Number, default: 4 },
padY: { type: Number, default: 6 },
svgWidth: { type: String, default: '100%' }
})


const points = computed(() => {
const n = props.data.length
if (!n) return ''
const min = Math.min(...props.data)
const max = Math.max(...props.data)
const w = props.width - props.padX * 2
const h = props.height - props.padY * 2
const dx = n > 1 ? w / (n - 1) : 0
const scaleY = (v) => {
if (max === min) return props.padY + h / 2
return props.padY + (1 - (v - min) / (max - min)) * h
}
return props.data.map((v, i) => `${props.padX + i * dx},${scaleY(v)}`).join(' ')
})
</script>


<style scoped>
svg { display:block; width:100%; height:auto; }
</style>