import DefaultTheme from 'vitepress/theme'
import ImageHeroModeDemo from './components/ImageHeroModeDemo.vue'
import type { Theme } from 'vitepress'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('ImageHeroModeDemo', ImageHeroModeDemo)
    },
} satisfies Theme
