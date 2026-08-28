import DefaultTheme from 'vitepress/theme'
import ImageHeroModeDemo from './components/ImageHeroModeDemo.vue'
import IframeOrderDemo from './components/IframeOrderDemo.vue'
import MoveablePositionDemo from './components/MoveablePositionDemo.vue'
import type { Theme } from 'vitepress'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('ImageHeroModeDemo', ImageHeroModeDemo)
        app.component('IframeOrderDemo', IframeOrderDemo)
        app.component('MoveablePositionDemo', MoveablePositionDemo)
    },
} satisfies Theme
